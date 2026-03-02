import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, stages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { sendStageMessage } from "@/lib/message-engine";

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

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const entries = payload.entry || [];
  const createdLeads: string[] = [];

  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field === "leadgen") {
        const leadData = change.value;
        const fieldData = parseMetaFields(leadData.field_data || []);

        const [defaultStage] = await db.select().from(stages).where(eq(stages.isDefault, true)).limit(1);
        if (!defaultStage) continue;

        const id = createId();
        const now = new Date().toISOString();
        await db.insert(leads).values({
          id,
          name: fieldData.full_name || fieldData.first_name || "Unknown",
          phone: fieldData.phone_number || "",
          email: fieldData.email || null,
          source: "meta_ads",
          sourceAdId: leadData.ad_id || null,
          stageId: defaultStage.id,
          metadata: JSON.stringify(leadData),
          createdAt: now, updatedAt: now,
        });

        sendStageMessage(id, defaultStage.id).catch(console.error);
        createdLeads.push(id);
      }
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
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        createdAt: now, updatedAt: now,
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
