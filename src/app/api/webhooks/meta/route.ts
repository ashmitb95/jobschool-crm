import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, stages, organizations, metaFormMappings, pipelines } from "@/lib/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { sendStageMessage } from "@/lib/message-engine";
import type { OrgSettings } from "@/types";

const GRAPH_API_VERSION = "v25.0";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "jobschool_verify";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function resolveOrg(pageId: string) {
  // Look up org by meta.pageId in settings JSON
  const [org] = await db
    .select()
    .from(organizations)
    .where(sql`json_extract(${organizations.settings}, '$.meta.pageId') = ${pageId}`)
    .limit(1);
  return org || null;
}

async function resolveTargetPipeline(orgId: string, formId: string | null, settings: OrgSettings) {
  // Check for explicit form→pipeline mapping
  if (formId) {
    const [mapping] = await db
      .select()
      .from(metaFormMappings)
      .where(and(eq(metaFormMappings.orgId, orgId), eq(metaFormMappings.formId, formId)))
      .limit(1);

    if (mapping) {
      return { pipelineId: mapping.pipelineId, formName: mapping.formName };
    }
  }

  // Fall back to org's default pipeline
  if (settings.defaultPipelineId) {
    return { pipelineId: settings.defaultPipelineId, formName: null };
  }

  // Fall back to first pipeline for the org
  const [firstPipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.orgId, orgId), isNull(pipelines.deletedAt)))
    .limit(1);

  return { pipelineId: firstPipeline?.id || null, formName: null };
}

async function fetchLeadFromGraph(leadgenId: string, accessToken: string): Promise<Record<string, string> | null> {
  if (!accessToken) {
    console.warn("[META WEBHOOK] No access token available, cannot fetch lead data");
    return null;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}?access_token=${accessToken}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error("[META WEBHOOK] Graph API error:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return parseMetaFields(data.field_data || []);
}

export async function POST(req: NextRequest) {
  const payload = await req.json();
  console.log("[META WEBHOOK] Received POST:", JSON.stringify(payload, null, 2));
  const entries = payload.entry || [];
  const createdLeads: string[] = [];

  for (const entry of entries) {
    const pageId = entry.id;
    const changes = entry.changes || [];

    for (const change of changes) {
      if (change.field !== "leadgen") continue;

      const leadData = change.value;
      const leadgenId = leadData.leadgen_id;
      const formId = leadData.form_id || null;

      // Resolve org from pageId
      const org = pageId ? await resolveOrg(pageId) : null;
      const settings: OrgSettings = org?.settings ? JSON.parse(org.settings) : {};
      const accessToken = settings.meta?.pageAccessToken || process.env.META_PAGE_ACCESS_TOKEN || "";

      // Fetch lead data from Graph API
      const fieldData = leadgenId ? await fetchLeadFromGraph(leadgenId, accessToken) : null;

      const leadName = fieldData?.["full_name"] || fieldData?.["full name"] || fieldData?.["first_name"] || fieldData?.["first name"] || "Unknown";
      const leadPhone = fieldData?.["phone_number"] || fieldData?.["phone"] || "";
      const leadEmail = fieldData?.["email"] || null;

      // Resolve target pipeline
      const orgId = org?.id || null;
      let targetPipelineId: string | null = null;
      let formName: string | null = null;

      if (orgId) {
        const target = await resolveTargetPipeline(orgId, formId, settings);
        targetPipelineId = target.pipelineId;
        formName = target.formName;
      }

      // Find default stage within the target pipeline
      const stageQuery = targetPipelineId
        ? db.select().from(stages).where(and(eq(stages.pipelineId, targetPipelineId), eq(stages.isDefault, true))).limit(1)
        : db.select().from(stages).where(eq(stages.isDefault, true)).limit(1);

      const [targetStage] = await stageQuery;
      if (!targetStage) {
        console.error("[META WEBHOOK] No default stage found for pipeline:", targetPipelineId);
        continue;
      }

      const id = createId();
      const now = new Date().toISOString();
      await db.insert(leads).values({
        id,
        name: leadName,
        phone: leadPhone,
        email: leadEmail,
        source: "meta_ads",
        sourceAdId: leadData.ad_id || null,
        stageId: targetStage.id,
        pipelineId: targetStage.pipelineId,
        metadata: JSON.stringify({ ...leadData, formId, formName }),
        createdAt: now,
        updatedAt: now,
      });

      console.log("[META WEBHOOK] Created lead:", id, leadName, "-> pipeline:", targetStage.pipelineId);
      sendStageMessage(id, targetStage.id).catch(console.error);
      createdLeads.push(id);
    }
  }

  // Direct POST for testing
  if (entries.length === 0 && payload.name) {
    const [defaultStage] = await db.select().from(stages).where(eq(stages.isDefault, true)).limit(1);
    if (defaultStage) {
      const id = createId();
      const now = new Date().toISOString();
      await db.insert(leads).values({
        id,
        name: payload.name,
        phone: payload.phone || "",
        email: payload.email || null,
        source: payload.source || "meta_ads",
        stageId: defaultStage.id,
        pipelineId: defaultStage.pipelineId,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        createdAt: now,
        updatedAt: now,
      });
      sendStageMessage(id, defaultStage.id).catch(console.error);
      createdLeads.push(id);
    }
  }

  return NextResponse.json({ received: true, created: createdLeads.length });
}

function parseMetaFields(fields: Array<{ name: string; values: string[] }>) {
  const result: Record<string, string> = {};
  for (const field of fields) {
    result[field.name] = field.values?.[0] || "";
  }
  return result;
}
