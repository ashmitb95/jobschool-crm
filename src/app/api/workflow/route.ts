import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stages, messageTemplates, stageFields, stageTransitions } from "@/lib/db/schema";
import { eq, asc, count, inArray } from "drizzle-orm";
import { requireAuth, userHasPipelineAccess } from "@/lib/auth";
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

  // Get stages with template names and field counts, scoped to pipeline
  const stageRows = await db
    .select({
      id: stages.id,
      name: stages.name,
      order: stages.order,
      color: stages.color,
      isDefault: stages.isDefault,
      templateId: stages.templateId,
      templateName: messageTemplates.name,
      workflowX: stages.workflowX,
      workflowY: stages.workflowY,
    })
    .from(stages)
    .leftJoin(messageTemplates, eq(stages.templateId, messageTemplates.id))
    .where(eq(stages.pipelineId, pipelineId))
    .orderBy(asc(stages.order));

  const stageIds = stageRows.map((s) => s.id);

  // Get field counts per stage
  let fieldCountMap: Record<string, number> = {};
  if (stageIds.length > 0) {
    const fieldCounts = await db
      .select({
        stageId: stageFields.stageId,
        count: count(stageFields.id),
      })
      .from(stageFields)
      .where(inArray(stageFields.stageId, stageIds))
      .groupBy(stageFields.stageId);

    for (const fc of fieldCounts) {
      fieldCountMap[fc.stageId] = fc.count;
    }
  }

  const stagesWithCounts = stageRows.map((s) => ({
    ...s,
    fieldCount: fieldCountMap[s.id] || 0,
  }));

  // Get transitions scoped to this pipeline's stages
  let transitions: typeof stageTransitions.$inferSelect[] = [];
  if (stageIds.length > 0) {
    transitions = await db
      .select()
      .from(stageTransitions)
      .where(inArray(stageTransitions.fromStageId, stageIds));
  }

  return NextResponse.json({ stages: stagesWithCounts, transitions });
}

export async function PUT(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { positions, pipelineId } = await request.json();

  if (!Array.isArray(positions)) {
    return apiError("positions array is required", 400);
  }

  // If pipelineId is provided, verify access
  if (pipelineId) {
    const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, pipelineId);
    if (!hasAccess) {
      return apiForbidden("You do not have access to this pipeline");
    }
  }

  for (const pos of positions) {
    if (pos.id) {
      // Always verify stage belongs to an accessible pipeline
      const [stage] = await db.select({ pipelineId: stages.pipelineId }).from(stages).where(eq(stages.id, pos.id)).limit(1);
      if (!stage?.pipelineId) {
        return apiError(`Stage ${pos.id} not found`, 404);
      }
      if (pipelineId && stage.pipelineId !== pipelineId) {
        return apiForbidden(`Stage ${pos.id} does not belong to specified pipeline`);
      }
      const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, stage.pipelineId);
      if (!hasAccess) {
        return apiForbidden(`No access to stage ${pos.id}`);
      }

      await db
        .update(stages)
        .set({ workflowX: Math.round(pos.x), workflowY: Math.round(pos.y) })
        .where(eq(stages.id, pos.id));
    }
  }

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "workflow.positions_updated",
    entityType: "workflow",
    metadata: { stageCount: positions.length, pipelineId },
  });

  return NextResponse.json({ success: true });
}
