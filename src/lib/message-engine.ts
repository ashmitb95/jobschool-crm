import { db } from "./db";
import { stages, leads, messages, messageTemplates } from "./db/schema";
import { eq } from "drizzle-orm";
import { sendTextMessage, sendMediaMessage, sendTemplateMessage } from "./whatsapp";
import { createId } from "@paralleldrive/cuid2";
import type { TemplateVariables } from "@/types";

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] || `{{${key}}}`;
  });
}

export async function sendStageMessage(leadId: string, stageId: string) {
  const [stage] = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
  if (!stage?.templateId) return null;

  const [template] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, stage.templateId)).limit(1);
  if (!template) return null;

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return null;

  const variables: TemplateVariables = {
    name: lead.name,
    phone: lead.phone,
    email: lead.email || "",
    stage: stage.name,
    cv_link: process.env.CV_OPTIMISER_URL || "http://localhost:3000/cv",
  };

  const renderedBody = renderTemplate(template.body, variables);

  // Use WhatsApp-approved template for initiating conversations (24hr rule)
  // Fall back to freeform text for replies within the messaging window
  let result;
  if (template.waTemplateName) {
    // Extract parameter values in order from the rendered body's {{var}} matches in the original template
    const paramMatches = template.body.match(/\{\{(\w+)\}\}/g) || [];
    const bodyParams = paramMatches.map((match) => {
      const key = match.replace(/\{\{|\}\}/g, "");
      return variables[key] || "";
    });
    result = await sendTemplateMessage(
      lead.phone,
      template.waTemplateName,
      template.waTemplateLanguage || "en",
      bodyParams
    );
  } else if (template.attachmentUrl) {
    result = await sendMediaMessage(lead.phone, renderedBody, template.attachmentUrl);
  } else {
    result = await sendTextMessage(lead.phone, renderedBody);
  }

  const id = createId();
  await db.insert(messages).values({
    id,
    leadId: lead.id,
    templateId: template.id,
    channel: template.channel,
    body: renderedBody,
    status: result.success ? "sent" : "failed",
    direction: "outbound",
    externalId: result.messageId || null,
    sentAt: result.success ? new Date().toISOString() : null,
  });

  return { id };
}

export async function sendManualMessage(leadId: string, body: string, channel: string = "whatsapp") {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return null;

  const result = await sendTextMessage(lead.phone, body);

  const id = createId();
  await db.insert(messages).values({
    id,
    leadId: lead.id,
    channel,
    body,
    status: result.success ? "sent" : "failed",
    direction: "outbound",
    externalId: result.messageId || null,
    sentAt: result.success ? new Date().toISOString() : null,
  });

  return { id, status: result.success ? "sent" : "failed" };
}
