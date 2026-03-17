import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userPipelines, pipelines } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError, apiNotFound, apiValidationError } from "@/lib/api-response";
import { updateUserPipelinesSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { createId } from "@paralleldrive/cuid2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { userId } = await params;

  // Verify user exists and belongs to the same org
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.orgId, admin.orgId!), isNull(users.deletedAt)))
    .limit(1);

  if (!targetUser) {
    return apiNotFound("User not found");
  }

  const assigned = await db
    .select({
      id: pipelines.id,
      name: pipelines.name,
      description: pipelines.description,
      createdAt: pipelines.createdAt,
    })
    .from(userPipelines)
    .innerJoin(pipelines, eq(userPipelines.pipelineId, pipelines.id))
    .where(and(eq(userPipelines.userId, userId), isNull(pipelines.deletedAt)));

  return apiSuccess(assigned);
}

export async function PUT(
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
  const parsed = updateUserPipelinesSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { pipelineIds } = parsed.data;

  // Verify all pipeline IDs belong to the admin's org
  if (pipelineIds.length > 0) {
    const orgPipelines = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(
        and(
          inArray(pipelines.id, pipelineIds),
          eq(pipelines.orgId, admin.orgId!),
          isNull(pipelines.deletedAt)
        )
      );

    if (orgPipelines.length !== pipelineIds.length) {
      return apiError("One or more pipeline IDs are invalid or do not belong to your organization", 400);
    }
  }

  // Delete existing assignments
  await db.delete(userPipelines).where(eq(userPipelines.userId, userId));

  // Insert new assignments
  if (pipelineIds.length > 0) {
    await db.insert(userPipelines).values(
      pipelineIds.map((pipelineId) => ({
        id: createId(),
        userId,
        pipelineId,
        createdAt: new Date().toISOString(),
      }))
    );
  }

  await logAudit({
    userId: admin.id,
    orgId: admin.orgId,
    action: "user.pipelines_updated",
    entityType: "user",
    entityId: userId,
    metadata: {
      pipelineIds,
      username: targetUser.username,
      updatedBy: admin.username,
    },
  });

  // Return the updated assignments
  const assigned = await db
    .select({
      id: pipelines.id,
      name: pipelines.name,
      description: pipelines.description,
      createdAt: pipelines.createdAt,
    })
    .from(userPipelines)
    .innerJoin(pipelines, eq(userPipelines.pipelineId, pipelines.id))
    .where(and(eq(userPipelines.userId, userId), isNull(pipelines.deletedAt)));

  return apiSuccess(assigned);
}
