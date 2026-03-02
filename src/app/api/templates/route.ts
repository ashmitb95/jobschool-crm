import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageTemplates, stages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export async function GET() {
  const rows = await db
    .select({
      id: messageTemplates.id,
      name: messageTemplates.name,
      body: messageTemplates.body,
      channel: messageTemplates.channel,
      attachmentUrl: messageTemplates.attachmentUrl,
      waTemplateName: messageTemplates.waTemplateName,
      waTemplateLanguage: messageTemplates.waTemplateLanguage,
      createdAt: messageTemplates.createdAt,
      updatedAt: messageTemplates.updatedAt,
      stageId: stages.id,
      stageName: stages.name,
    })
    .from(messageTemplates)
    .leftJoin(stages, eq(stages.templateId, messageTemplates.id))
    .orderBy(desc(messageTemplates.createdAt));

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      stage: r.stageId ? { id: r.stageId, name: r.stageName } : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const { name, body, channel, attachmentUrl, stageId, waTemplateName, waTemplateLanguage } = await req.json();

  if (!name || !body) {
    return NextResponse.json({ error: "Name and body are required" }, { status: 400 });
  }

  const id = createId();
  const now = new Date().toISOString();
  await db.insert(messageTemplates).values({
    id, name, body,
    channel: channel || "whatsapp",
    attachmentUrl: attachmentUrl || null,
    waTemplateName: waTemplateName || null,
    waTemplateLanguage: waTemplateLanguage || "en",
    createdAt: now, updatedAt: now,
  });

  if (stageId) {
    await db.update(stages).set({ templateId: id }).where(eq(stages.id, stageId));
  }

  return NextResponse.json({ id, name, body, channel: channel || "whatsapp" }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, name, body, channel, attachmentUrl, stageId, waTemplateName, waTemplateLanguage } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Template id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (body !== undefined) updates.body = body;
  if (channel !== undefined) updates.channel = channel;
  if (attachmentUrl !== undefined) updates.attachmentUrl = attachmentUrl;
  if (waTemplateName !== undefined) updates.waTemplateName = waTemplateName;
  if (waTemplateLanguage !== undefined) updates.waTemplateLanguage = waTemplateLanguage;

  await db.update(messageTemplates).set(updates).where(eq(messageTemplates.id, id));

  if (stageId !== undefined) {
    await db.update(stages).set({ templateId: null }).where(eq(stages.templateId, id));
    if (stageId) {
      await db.update(stages).set({ templateId: id }).where(eq(stages.id, stageId));
    }
  }

  return NextResponse.json({ success: true });
}
