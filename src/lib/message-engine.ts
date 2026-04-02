import { db } from "./db";
import { stages, leads, messages, messageTemplates, emailTemplates, organizations } from "./db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { getProvider } from "./channels";
import { renderEmail } from "./email/render";
import type { TemplateVariables, OrgSettings } from "@/types";

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] || `{{${key}}}`;
  });
}

async function getOrgSettings(orgId: string | null): Promise<OrgSettings | undefined> {
  if (!orgId) return undefined;
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org?.settings) return undefined;
  try { return JSON.parse(org.settings) as OrgSettings; } catch { return undefined; }
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
    cv_link: process.env.CV_OPTIMISER_URL || "http://localhost:3001/cv",
  };

  const orgSettings = await getOrgSettings(template.orgId);
  const provider = getProvider(template.channel);
  if (!provider) return null;

  let result;
  if (template.channel === "email") {
    // Email channel: use HTML template if linked, otherwise wrap body as HTML
    let html: string;
    let subject = renderTemplate(template.subject || "Update from LeadLynx", variables);

    if (template.emailTemplateId) {
      const [emailTpl] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, template.emailTemplateId)).limit(1);
      if (emailTpl) {
        html = renderEmail(emailTpl.filename, variables);
        subject = renderTemplate(emailTpl.subject, variables);
      } else {
        html = `<p>${renderTemplate(template.body, variables)}</p>`;
      }
    } else {
      html = `<p>${renderTemplate(template.body, variables)}</p>`;
    }

    if (!lead.email) return null;
    result = await provider.send({ to: lead.email, body: html, subject }, orgSettings);
  } else {
    // WhatsApp / SMS channel
    const renderedBody = renderTemplate(template.body, variables);

    if (template.waTemplateName) {
      const paramMatches = template.body.match(/\{\{(\w+)\}\}/g) || [];
      const bodyParams = paramMatches.map((match) => {
        const key = match.replace(/\{\{|\}\}/g, "");
        return variables[key] || "";
      });
      result = await provider.send({
        to: lead.phone,
        body: renderedBody,
        templateName: template.waTemplateName,
        templateLanguage: template.waTemplateLanguage || "en",
        templateParams: bodyParams,
      }, orgSettings);
    } else if (template.attachmentUrl) {
      result = await provider.send({
        to: lead.phone,
        body: renderedBody,
        attachmentUrl: template.attachmentUrl,
      }, orgSettings);
    } else {
      result = await provider.send({ to: lead.phone, body: renderedBody }, orgSettings);
    }
  }

  const id = createId();
  await db.insert(messages).values({
    id,
    leadId: lead.id,
    templateId: template.id,
    channel: template.channel,
    body: template.channel === "email" ? `[Email] ${template.subject || ""}` : renderTemplate(template.body, variables),
    status: result.success ? "sent" : "failed",
    direction: "outbound",
    externalId: result.externalId || null,
    sentAt: result.success ? new Date().toISOString() : null,
  });

  return { id };
}

export async function sendManualMessage(leadId: string, body: string, channel: string = "whatsapp") {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return null;

  const provider = getProvider(channel);
  if (!provider) return null;

  // Get org settings from the lead's pipeline
  let orgSettings: OrgSettings | undefined;
  if (lead.pipelineId) {
    const { pipelines } = await import("./db/schema");
    const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, lead.pipelineId)).limit(1);
    if (pipeline) orgSettings = await getOrgSettings(pipeline.orgId);
  }

  let result;
  if (channel === "email") {
    if (!lead.email) return null;
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;">${body.replace(/\n/g, "<br>")}</div>`;
    result = await provider.send({ to: lead.email, body: html, subject: "Message from LeadLynx" }, orgSettings);
  } else {
    result = await provider.send({ to: lead.phone, body }, orgSettings);
  }

  const id = createId();
  await db.insert(messages).values({
    id,
    leadId: lead.id,
    channel,
    body,
    status: result.success ? "sent" : "failed",
    direction: "outbound",
    externalId: result.externalId || null,
    sentAt: result.success ? new Date().toISOString() : null,
  });

  return { id, status: result.success ? "sent" : "failed" };
}
