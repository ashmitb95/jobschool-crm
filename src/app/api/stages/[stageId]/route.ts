import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stages, leads, stageFields, stageTransitions, messageTemplates } from "@/lib/db/schema";
import { eq, count, and, isNull } from "drizzle-orm";
import { requireAuth, userHasPipelineAccess } from "@/lib/auth";
import { apiForbidden, apiNotFound, apiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

async function getStageAndVerifyAccess(stageId: string, user: { id: string; role: string; orgId: string | null }) {
  const [stage] = await db
    .select({
      id: stages.id,
      name: stages.name,
      order: stages.order,
      color: stages.color,
      templateId: stages.templateId,
      isDefault: stages.isDefault,
      pipelineId: stages.pipelineId,
      workflowX: stages.workflowX,
      workflowY: stages.workflowY,
      createdAt: stages.createdAt,
    })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);

  if (!stage) return { error: apiNotFound("Stage not found") };

  if (!stage.pipelineId) {
    return { error: apiForbidden("Stage has no pipeline assigned") };
  }

  const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, stage.pipelineId);
  if (!hasAccess) {
    return { error: apiForbidden("You do not have access to this pipeline") };
  }

  return { stage };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { stageId } = await params;
  const result = await getStageAndVerifyAccess(stageId, user);
  if ("error" in result) return result.error;
  const { stage } = result;

  // Get template info if linked
  let template = null;
  if (stage.templateId) {
    const [t] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, stage.templateId)).limit(1);
    template = t || null;
  }

  // Get field count
  const [fieldResult] = await db
    .select({ count: count(stageFields.id) })
    .from(stageFields)
    .where(eq(stageFields.stageId, stageId));

  // Get lead count (exclude soft-deleted)
  const [leadResult] = await db
    .select({ count: count(leads.id) })
    .from(leads)
    .where(and(eq(leads.stageId, stageId), isNull(leads.deletedAt)));

  return NextResponse.json({
    ...stage,
    template,
    fieldCount: fieldResult?.count || 0,
    leadCount: leadResult?.count || 0,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { stageId } = await params;
  const result = await getStageAndVerifyAccess(stageId, user);
  if ("error" in result) return result.error;

  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.color !== undefined) updates.color = body.color;
  if (body.isDefault !== undefined) updates.isDefault = body.isDefault;
  if (body.templateId !== undefined) updates.templateId = body.templateId || null;

  if (Object.keys(updates).length === 0) {
    return apiError("No updates provided", 400);
  }

  // If setting as default, unset all others first (within the same pipeline)
  if (body.isDefault === true && result.stage.pipelineId) {
    await db.update(stages).set({ isDefault: false }).where(eq(stages.pipelineId, result.stage.pipelineId));
  }

  await db.update(stages).set(updates).where(eq(stages.id, stageId));

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "stage.updated",
    entityType: "stage",
    entityId: stageId,
    metadata: { updates },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { stageId } = await params;
  const result = await getStageAndVerifyAccess(stageId, user);
  if ("error" in result) return result.error;

  // Check if leads are assigned (exclude soft-deleted)
  const [leadResult] = await db
    .select({ count: count(leads.id) })
    .from(leads)
    .where(and(eq(leads.stageId, stageId), isNull(leads.deletedAt)));

  if (leadResult && leadResult.count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${leadResult.count} lead(s) are assigned to this stage` },
      { status: 409 }
    );
  }

  // Delete related data
  await db.delete(stageTransitions).where(eq(stageTransitions.fromStageId, stageId));
  await db.delete(stageTransitions).where(eq(stageTransitions.toStageId, stageId));
  await db.delete(stageFields).where(eq(stageFields.stageId, stageId));
  await db.delete(stages).where(eq(stages.id, stageId));

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "stage.deleted",
    entityType: "stage",
    entityId: stageId,
    metadata: { name: result.stage.name },
  });

  return NextResponse.json({ success: true });
}
