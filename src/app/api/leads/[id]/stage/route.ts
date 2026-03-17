import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, stages, stageFields, stageTransitions, leadStageData } from "@/lib/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { sendStageMessage } from "@/lib/message-engine";
import { requireAuth, userHasPipelineAccess } from "@/lib/auth";
import { apiError, apiNotFound } from "@/lib/api-response";
import { logAudit, logLeadActivity } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const { stageId, fieldValues } = await req.json();

  if (!stageId) return apiError("stageId is required", 400);

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .limit(1);
  if (!lead) return apiNotFound("Lead not found");

  // Verify pipeline access
  if (lead.pipelineId) {
    const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, lead.pipelineId);
    if (!hasAccess) return apiError("No access to this lead", 403);
  }

  // Verify target stage is in the same pipeline
  const [targetStage] = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
  if (!targetStage) return apiError("Target stage not found", 400);
  if (lead.pipelineId && targetStage.pipelineId !== lead.pipelineId) {
    return apiError("Cannot move lead to a stage in a different pipeline", 400);
  }

  // Check if transition is allowed
  const allowedTransitions = await db
    .select()
    .from(stageTransitions)
    .where(eq(stageTransitions.fromStageId, lead.stageId));

  if (allowedTransitions.length > 0) {
    const allowed = allowedTransitions.some((t) => t.toStageId === stageId);
    if (!allowed) return apiError("This stage transition is not allowed", 403);
  }

  // Validate required fields for target stage
  const fields = await db
    .select()
    .from(stageFields)
    .where(eq(stageFields.stageId, stageId))
    .orderBy(asc(stageFields.order));

  const requiredFields = fields.filter((f) => f.required);
  const missingFields = requiredFields.filter(
    (f) => !fieldValues?.[f.fieldKey]?.toString().trim()
  );

  if (missingFields.length > 0) {
    return NextResponse.json(
      {
        error: "Required fields missing",
        missingFields: missingFields.map((f) => ({ name: f.name, fieldKey: f.fieldKey })),
      },
      { status: 400 }
    );
  }

  // Get old stage name for activity log
  const [oldStage] = await db.select({ name: stages.name }).from(stages).where(eq(stages.id, lead.stageId)).limit(1);

  // Update lead stage
  await db
    .update(leads)
    .set({ stageId, updatedAt: new Date().toISOString() })
    .where(eq(leads.id, id));

  // Save field values
  if (fieldValues && fields.length > 0) {
    for (const field of fields) {
      const value = fieldValues[field.fieldKey] ?? null;
      if (value !== null && value !== "") {
        const [existing] = await db
          .select()
          .from(leadStageData)
          .where(and(eq(leadStageData.leadId, id), eq(leadStageData.fieldId, field.id)))
          .limit(1);

        if (existing) {
          await db
            .update(leadStageData)
            .set({ value, stageId, updatedAt: new Date().toISOString() })
            .where(eq(leadStageData.id, existing.id));
        } else {
          await db.insert(leadStageData).values({
            id: createId(),
            leadId: id,
            stageId,
            fieldId: field.id,
            value,
          });
        }
      }
    }
  }

  sendStageMessage(id, stageId).catch(console.error);

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "lead.stage_changed",
    entityType: "lead",
    entityId: id,
    metadata: { fromStageId: lead.stageId, toStageId: stageId },
  });

  await logLeadActivity({
    leadId: id,
    userId: user.id,
    action: "stage_changed",
    description: `Moved from ${oldStage?.name || "Unknown"} to ${targetStage.name}`,
    metadata: { fromStageId: lead.stageId, toStageId: stageId },
  });

  return NextResponse.json({ success: true, leadId: id, stageId });
}
