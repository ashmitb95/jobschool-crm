import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pipelines, stages, leads } from "@/lib/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import {
  requireAuth,
  requireAdmin,
  userHasPipelineAccess,
} from "@/lib/auth";
import {
  apiSuccess,
  apiError,
  apiNotFound,
  apiValidationError,
  apiForbidden,
} from "@/lib/api-response";
import { updatePipelineSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ pipelineId: string }> };

// GET /api/pipelines/[pipelineId] — pipeline details
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const user = await requireAuth(request);
  if (user instanceof Response) return user;

  const { pipelineId } = await context.params;

  try {
    const hasAccess = await userHasPipelineAccess(
      user.id,
      user.role,
      user.orgId,
      pipelineId
    );
    if (!hasAccess) {
      return apiForbidden("You do not have access to this pipeline");
    }

    const [pipeline] = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.id, pipelineId), isNull(pipelines.deletedAt)))
      .limit(1);

    if (!pipeline) {
      return apiNotFound("Pipeline not found");
    }

    // Get stage count
    const [stageResult] = await db
      .select({ stageCount: count(stages.id) })
      .from(stages)
      .where(eq(stages.pipelineId, pipelineId));

    // Get lead count (only non-deleted leads)
    const [leadResult] = await db
      .select({ leadCount: count(leads.id) })
      .from(leads)
      .where(
        and(eq(leads.pipelineId, pipelineId), isNull(leads.deletedAt))
      );

    return apiSuccess({
      ...pipeline,
      stageCount: stageResult?.stageCount ?? 0,
      leadCount: leadResult?.leadCount ?? 0,
    });
  } catch (error) {
    console.error("Failed to get pipeline:", error);
    return apiError("Failed to get pipeline", 500);
  }
}

// PATCH /api/pipelines/[pipelineId] — update pipeline (admin only)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;

  const { pipelineId } = await context.params;

  try {
    const hasAccess = await userHasPipelineAccess(
      user.id,
      user.role,
      user.orgId,
      pipelineId
    );
    if (!hasAccess) {
      return apiForbidden("You do not have access to this pipeline");
    }

    const [existing] = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.id, pipelineId), isNull(pipelines.deletedAt)))
      .limit(1);

    if (!existing) {
      return apiNotFound("Pipeline not found");
    }

    const body = await request.json();
    const parsed = updatePipelineSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { name, description } = parsed.data;

    const updates: Record<string, string> = {
      updatedAt: new Date().toISOString(),
    };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const [updated] = await db
      .update(pipelines)
      .set(updates)
      .where(eq(pipelines.id, pipelineId))
      .returning();

    await logAudit({
      userId: user.id,
      orgId: user.orgId,
      action: "pipeline.updated",
      entityType: "pipeline",
      entityId: pipelineId,
      metadata: { changes: parsed.data },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error("Failed to update pipeline:", error);
    return apiError("Failed to update pipeline", 500);
  }
}

// DELETE /api/pipelines/[pipelineId] — soft delete pipeline (admin only)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;

  const { pipelineId } = await context.params;

  try {
    const hasAccess = await userHasPipelineAccess(
      user.id,
      user.role,
      user.orgId,
      pipelineId
    );
    if (!hasAccess) {
      return apiForbidden("You do not have access to this pipeline");
    }

    const [existing] = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.id, pipelineId), isNull(pipelines.deletedAt)))
      .limit(1);

    if (!existing) {
      return apiNotFound("Pipeline not found");
    }

    // Check for active (non-deleted) leads in this pipeline
    const [leadResult] = await db
      .select({ leadCount: count(leads.id) })
      .from(leads)
      .where(
        and(eq(leads.pipelineId, pipelineId), isNull(leads.deletedAt))
      );

    if (leadResult && leadResult.leadCount > 0) {
      return apiError(
        `Cannot delete pipeline with ${leadResult.leadCount} active lead(s). Remove or move all leads first.`,
        400
      );
    }

    const now = new Date().toISOString();
    const [deleted] = await db
      .update(pipelines)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(pipelines.id, pipelineId))
      .returning();

    await logAudit({
      userId: user.id,
      orgId: user.orgId,
      action: "pipeline.deleted",
      entityType: "pipeline",
      entityId: pipelineId,
      metadata: { name: existing.name },
    });

    return apiSuccess({ message: "Pipeline deleted", pipeline: deleted });
  } catch (error) {
    console.error("Failed to delete pipeline:", error);
    return apiError("Failed to delete pipeline", 500);
  }
}
