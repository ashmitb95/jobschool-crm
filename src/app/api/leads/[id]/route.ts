import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, stages, messages } from "@/lib/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { requireAuth, userHasPipelineAccess } from "@/lib/auth";
import { apiError, apiNotFound } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

async function getLeadWithAccess(req: NextRequest, leadId: string) {
  const user = await requireAuth(req);
  if (user instanceof NextResponse) return { user } as { user: NextResponse };

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
    .limit(1);

  if (!lead) return { error: apiNotFound("Lead not found") };

  if (lead.pipelineId) {
    const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, lead.pipelineId);
    if (!hasAccess) return { error: apiError("No access to this lead", 403) };
  }

  return { user, lead };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getLeadWithAccess(req, id);
  if ("error" in result) return result.error;
  if (result.user instanceof NextResponse) return result.user;

  const [lead] = await db
    .select({
      id: leads.id, name: leads.name, email: leads.email, phone: leads.phone,
      source: leads.source, sourceAdId: leads.sourceAdId, stageId: leads.stageId,
      pipelineId: leads.pipelineId,
      notes: leads.notes, metadata: leads.metadata,
      createdAt: leads.createdAt, updatedAt: leads.updatedAt,
      stageName: stages.name, stageColor: stages.color, stageOrder: stages.order,
    })
    .from(leads)
    .leftJoin(stages, eq(leads.stageId, stages.id))
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)));

  if (!lead) return apiNotFound("Lead not found");

  const leadMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.leadId, id))
    .orderBy(desc(messages.createdAt));

  return NextResponse.json({
    ...lead,
    stage: { id: lead.stageId, name: lead.stageName, color: lead.stageColor, order: lead.stageOrder },
    messages: leadMessages,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getLeadWithAccess(req, id);
  if ("error" in result) return result.error;
  if (result.user instanceof NextResponse) return result.user;
  const user = result.user;

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.source !== undefined) updates.source = body.source;

  await db.update(leads).set(updates).where(eq(leads.id, id));

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "lead.updated",
    entityType: "lead",
    entityId: id,
  });

  const [lead] = await db
    .select({
      id: leads.id, name: leads.name, email: leads.email, phone: leads.phone,
      source: leads.source, stageId: leads.stageId, pipelineId: leads.pipelineId,
      notes: leads.notes, createdAt: leads.createdAt, stageName: stages.name, stageColor: stages.color,
    })
    .from(leads)
    .leftJoin(stages, eq(leads.stageId, stages.id))
    .where(eq(leads.id, id));

  return NextResponse.json(lead);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getLeadWithAccess(req, id);
  if ("error" in result) return result.error;
  if (result.user instanceof NextResponse) return result.user;
  const user = result.user;

  // Soft delete
  await db
    .update(leads)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(leads.id, id));

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "lead.deleted",
    entityType: "lead",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
