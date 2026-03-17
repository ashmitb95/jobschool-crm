import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAdmin, invalidateAllUserSessions } from "@/lib/auth";
import { apiSuccess, apiError, apiNotFound, apiForbidden, apiValidationError } from "@/lib/api-response";
import { updateUserSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { userId } = await params;

  // Verify user exists and belongs to the same org
  const [targetUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.orgId, admin.orgId!), isNull(users.deletedAt)))
    .limit(1);

  if (!targetUser) {
    return apiNotFound("User not found");
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { displayName, email, role } = parsed.data;

  const updates: Record<string, string> = {
    updatedAt: new Date().toISOString(),
  };

  if (displayName !== undefined) updates.displayName = displayName;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;

  await db.update(users).set(updates).where(eq(users.id, userId));

  const [updatedUser] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      orgId: users.orgId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  await logAudit({
    userId: admin.id,
    orgId: admin.orgId,
    action: "user.updated",
    entityType: "user",
    entityId: userId,
    metadata: { changes: parsed.data, updatedBy: admin.username },
  });

  return apiSuccess(updatedUser);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { userId } = await params;

  // Cannot delete yourself
  if (userId === admin.id) {
    return apiForbidden("Cannot delete your own account");
  }

  // Verify user exists and belongs to the same org
  const [targetUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.orgId, admin.orgId!), isNull(users.deletedAt)))
    .limit(1);

  if (!targetUser) {
    return apiNotFound("User not found");
  }

  // Soft delete
  await db
    .update(users)
    .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId));

  // Invalidate all sessions for the deleted user
  await invalidateAllUserSessions(userId);

  await logAudit({
    userId: admin.id,
    orgId: admin.orgId,
    action: "user.deleted",
    entityType: "user",
    entityId: userId,
    metadata: { username: targetUser.username, deletedBy: admin.username },
  });

  return apiSuccess({ message: "User deleted" });
}
