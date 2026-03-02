import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, stages, messages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [lead] = await db
    .select({
      id: leads.id, name: leads.name, email: leads.email, phone: leads.phone,
      source: leads.source, sourceAdId: leads.sourceAdId, stageId: leads.stageId,
      notes: leads.notes, metadata: leads.metadata,
      createdAt: leads.createdAt, updatedAt: leads.updatedAt,
      stageName: stages.name, stageColor: stages.color, stageOrder: stages.order,
    })
    .from(leads)
    .leftJoin(stages, eq(leads.stageId, stages.id))
    .where(eq(leads.id, id));

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

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
  const body = await req.json();

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.source !== undefined) updates.source = body.source;

  await db.update(leads).set(updates).where(eq(leads.id, id));

  const [lead] = await db
    .select({
      id: leads.id, name: leads.name, email: leads.email, phone: leads.phone,
      source: leads.source, stageId: leads.stageId, notes: leads.notes,
      createdAt: leads.createdAt, stageName: stages.name, stageColor: stages.color,
    })
    .from(leads)
    .leftJoin(stages, eq(leads.stageId, stages.id))
    .where(eq(leads.id, id));

  return NextResponse.json(lead);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(leads).where(eq(leads.id, id));
  return NextResponse.json({ success: true });
}
