import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageTemplates, stages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireAuth } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { createTemplateSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  // Scope to user's org
  const orgCondition = user.orgId ? eq(messageTemplates.orgId, user.orgId) : undefined;

  const rows = await db
    .select({
      id: messageTemplates.id,
      name: messageTemplates.name,
      body: messageTemplates.body,
      channel: messageTemplates.channel,
      attachmentUrl: messageTemplates.attachmentUrl,
      waTemplateName: messageTemplates.waTemplateName,
      waTemplateLanguage: messageTemplates.waTemplateLanguage,
      emailTemplateId: messageTemplates.emailTemplateId,
      subject: messageTemplates.subject,
      createdAt: messageTemplates.createdAt,
      updatedAt: messageTemplates.updatedAt,
      stageId: stages.id,
      stageName: stages.name,
    })
    .from(messageTemplates)
    .leftJoin(stages, eq(stages.templateId, messageTemplates.id))
    .where(orgCondition)
    .orderBy(desc(messageTemplates.createdAt));

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      stage: r.stageId ? { id: r.stageId, name: r.stageName } : null,
    }))
  );
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const body = await request.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { name, body: templateBody, channel, attachmentUrl, waTemplateName, waTemplateLanguage, emailTemplateId, subject } = parsed.data;
  const stageId = body.stageId; // stageId is not in the Zod schema but used for linking

  const id = createId();
  const now = new Date().toISOString();
  await db.insert(messageTemplates).values({
    id, name, body: templateBody,
    channel: channel || "whatsapp",
    attachmentUrl: attachmentUrl || null,
    waTemplateName: waTemplateName || null,
    waTemplateLanguage: waTemplateLanguage || "en",
    emailTemplateId: emailTemplateId || null,
    subject: subject || null,
    orgId: user.orgId,
    createdAt: now, updatedAt: now,
  });

  if (stageId) {
    const [targetStage] = await db.select({ pipelineId: stages.pipelineId }).from(stages).where(eq(stages.id, stageId)).limit(1);
    if (targetStage?.pipelineId) {
      const { userHasPipelineAccess } = await import("@/lib/auth");
      const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, targetStage.pipelineId);
      if (!hasAccess) return apiError("Cannot link template to this stage", 403);
    }
    await db.update(stages).set({ templateId: id }).where(eq(stages.id, stageId));
  }

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "template.created",
    entityType: "template",
    entityId: id,
    metadata: { name },
  });

  return NextResponse.json({ id, name, body: templateBody, channel: channel || "whatsapp" }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const reqBody = await request.json();
  const { id, name, body: templateBody, channel, attachmentUrl, stageId, waTemplateName, waTemplateLanguage, emailTemplateId, subject } = reqBody;

  if (!id) {
    return apiError("Template id is required", 400);
  }

  // Verify template belongs to user's org
  if (user.orgId) {
    const [existing] = await db
      .select({ orgId: messageTemplates.orgId })
      .from(messageTemplates)
      .where(eq(messageTemplates.id, id))
      .limit(1);
    if (existing && existing.orgId && existing.orgId !== user.orgId) {
      return apiError("Template not found", 404);
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (templateBody !== undefined) updates.body = templateBody;
  if (channel !== undefined) updates.channel = channel;
  if (attachmentUrl !== undefined) updates.attachmentUrl = attachmentUrl;
  if (waTemplateName !== undefined) updates.waTemplateName = waTemplateName;
  if (waTemplateLanguage !== undefined) updates.waTemplateLanguage = waTemplateLanguage;
  if (emailTemplateId !== undefined) updates.emailTemplateId = emailTemplateId;
  if (subject !== undefined) updates.subject = subject;

  await db.update(messageTemplates).set(updates).where(eq(messageTemplates.id, id));

  if (stageId !== undefined) {
    await db.update(stages).set({ templateId: null }).where(eq(stages.templateId, id));
    if (stageId) {
      const [targetStage] = await db.select({ pipelineId: stages.pipelineId }).from(stages).where(eq(stages.id, stageId)).limit(1);
      if (targetStage?.pipelineId) {
        const { userHasPipelineAccess } = await import("@/lib/auth");
        const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, targetStage.pipelineId);
        if (!hasAccess) return apiError("Cannot link template to this stage", 403);
      }
      await db.update(stages).set({ templateId: id }).where(eq(stages.id, stageId));
    }
  }

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "template.updated",
    entityType: "template",
    entityId: id,
    metadata: { updatedFields: Object.keys(updates).filter((k) => k !== "updatedAt") },
  });

  return NextResponse.json({ success: true });
}
