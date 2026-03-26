import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getSessionUser,
  hashPassword,
  verifyPassword,
  invalidateAllUserSessions,
  createSession,
} from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return apiUnauthorized();

  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { currentPassword, newPassword } = parsed.data;

  // Fetch current hash
  const [dbUser] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) return apiError("User not found", 404);

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) return apiError("Current password is incorrect", 400);

  // Update password and clear mustChangePassword flag
  const newHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash: newHash, mustChangePassword: false, updatedAt: new Date().toISOString() })
    .where(eq(users.id, user.id));

  // Invalidate all sessions and create a new one
  await invalidateAllUserSessions(user.id);
  const newToken = await createSession(user.id);

  const res = NextResponse.json({ success: true, data: { message: "Password changed successfully" } });
  setAuthCookies(res, newToken, user.username, user.role);

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "user.password_changed",
    entityType: "user",
    entityId: user.id,
  });

  return res;
}
