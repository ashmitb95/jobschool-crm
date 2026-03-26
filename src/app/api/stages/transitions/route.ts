import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stages, stageTransitions } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireAuth, getUserPipelineIds, userHasPipelineAccess } from "@/lib/auth";
import { apiError, apiForbidden } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const pipelineId = request.nextUrl.searchParams.get("pipelineId");

  if (!pipelineId) {
    return apiError("pipelineId query parameter is required", 400);
  }

  const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, pipelineId);
  if (!hasAccess) {
    return apiForbidden("You do not have access to this pipeline");
  }

  // Get stage IDs for this pipeline
  const pipelineStages = await db
    .select({ id: stages.id })
    .from(stages)
    .where(eq(stages.pipelineId, pipelineId));
  const stageIds = pipelineStages.map((s) => s.id);

  if (stageIds.length === 0) {
    return NextResponse.json([]);
  }

  const rows = await db
    .select()
    .from(stageTransitions)
    .where(inArray(stageTransitions.fromStageId, stageIds));

  return NextResponse.json(rows);
}

export async function PUT(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { transitions, pipelineId } = await request.json();

  if (!Array.isArray(transitions)) {
    return apiError("transitions array is required", 400);
  }

  // Collect all stage IDs referenced in transitions
  const allStageIds = new Set<string>();
  for (const t of transitions) {
    if (t.fromStageId) allStageIds.add(t.fromStageId);
    if (t.toStageId) allStageIds.add(t.toStageId);
  }

  // Verify all referenced stages belong to accessible pipelines
  const userPipelineIds = await getUserPipelineIds(user.id, user.role, user.orgId);
  if (allStageIds.size > 0) {
    const referencedStages = await db
      .select({ id: stages.id, pipelineId: stages.pipelineId })
      .from(stages)
      .where(inArray(stages.id, [...allStageIds]));

    for (const s of referencedStages) {
      if (!s.pipelineId || !userPipelineIds.includes(s.pipelineId)) {
        return apiForbidden(`No access to stage ${s.id}`);
      }
    }
  }

  // If pipelineId is provided, only delete transitions for that pipeline's stages
  if (pipelineId) {
    const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, pipelineId);
    if (!hasAccess) {
      return apiForbidden("You do not have access to this pipeline");
    }

    const pipelineStages = await db
      .select({ id: stages.id })
      .from(stages)
      .where(eq(stages.pipelineId, pipelineId));
    const stageIds = pipelineStages.map((s) => s.id);

    if (stageIds.length > 0) {
      await db.delete(stageTransitions).where(inArray(stageTransitions.fromStageId, stageIds));
    }
  } else {
    return apiError("pipelineId is required", 400);
  }

  // Insert new transitions
  for (const t of transitions) {
    if (t.fromStageId && t.toStageId) {
      await db.insert(stageTransitions).values({
        id: createId(),
        fromStageId: t.fromStageId,
        toStageId: t.toStageId,
      });
    }
  }

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "transitions.updated",
    entityType: "stage_transition",
    metadata: { count: transitions.length, pipelineId },
  });

  return NextResponse.json({ success: true, count: transitions.length });
}
