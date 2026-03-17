import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { verifyPassword, createSession, setAuthCookies } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { apiError, apiValidationError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { username, password } = parsed.data;
  const normalizedUsername = username.trim().toLowerCase();

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.username, normalizedUsername), isNull(users.deletedAt)))
    .limit(1);

  if (!user) return apiError("Invalid username or password", 401);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return apiError("Invalid username or password", 401);

  const token = await createSession(user.id);

  const redirect = user.role === "super_admin" ? "/manage" : "/pipeline";

  const res = NextResponse.json({
    success: true,
    data: {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      redirect,
    },
  });

  setAuthCookies(res, token, user.username, user.role);

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "user.login",
    entityType: "user",
    entityId: user.id,
  });

  return res;
}
