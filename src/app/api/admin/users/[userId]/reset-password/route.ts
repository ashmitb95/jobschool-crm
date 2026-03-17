import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAdmin, hashPassword, invalidateAllUserSessions } from "@/lib/auth";
import { apiSuccess, apiNotFound, apiValidationError } from "@/lib/api-response";
import { resetPasswordSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { userId } = await params;

  // Verify user exists and belongs to the same org
  const [targetUser] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.orgId, admin.orgId!), isNull(users.deletedAt)))
    .limit(1);

  if (!targetUser) {
    return apiNotFound("User not found");
  }

  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { newPassword } = parsed.data;
  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId));

  // Invalidate all sessions so user must log in with new password
  await invalidateAllUserSessions(userId);

  await logAudit({
    userId: admin.id,
    orgId: admin.orgId,
    action: "user.password_reset",
    entityType: "user",
    entityId: userId,
    metadata: { username: targetUser.username, resetBy: admin.username },
  });

  return apiSuccess({ message: "Password reset successfully" });
}
