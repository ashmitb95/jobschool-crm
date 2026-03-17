import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, leadStageData, stageFields, stages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, userHasPipelineAccess } from "@/lib/auth";
import { apiForbidden, apiNotFound } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  // Get lead and verify pipeline access
  const [lead] = await db
    .select({ id: leads.id, pipelineId: leads.pipelineId, deletedAt: leads.deletedAt })
    .from(leads)
    .where(eq(leads.id, id))
    .limit(1);

  if (!lead || lead.deletedAt) {
    return apiNotFound("Lead not found");
  }

  if (!lead.pipelineId) {
    return apiForbidden("Lead has no pipeline assigned");
  }

  const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, lead.pipelineId);
  if (!hasAccess) {
    return apiForbidden("You do not have access to this lead's pipeline");
  }

  const rows = await db
    .select({
      id: leadStageData.id,
      leadId: leadStageData.leadId,
      stageId: leadStageData.stageId,
      fieldId: leadStageData.fieldId,
      value: leadStageData.value,
      createdAt: leadStageData.createdAt,
      fieldName: stageFields.name,
      fieldKey: stageFields.fieldKey,
      fieldType: stageFields.fieldType,
      stageName: stages.name,
      stageColor: stages.color,
    })
    .from(leadStageData)
    .innerJoin(stageFields, eq(leadStageData.fieldId, stageFields.id))
    .innerJoin(stages, eq(leadStageData.stageId, stages.id))
    .where(eq(leadStageData.leadId, id));

  // Group by stage
  const grouped: Record<string, { stageName: string; stageColor: string; stageId: string; fields: Array<{ fieldName: string; fieldKey: string; fieldType: string; value: string | null }> }> = {};
  for (const row of rows) {
    if (!grouped[row.stageId]) {
      grouped[row.stageId] = {
        stageName: row.stageName,
        stageColor: row.stageColor,
        stageId: row.stageId,
        fields: [],
      };
    }
    grouped[row.stageId].fields.push({
      fieldName: row.fieldName,
      fieldKey: row.fieldKey,
      fieldType: row.fieldType,
      value: row.value,
    });
  }

  return NextResponse.json(Object.values(grouped));
}
