import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, leads } from "@/lib/db/schema";
import { eq, like } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { verifyWebhookSignature } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "jobschool_verify";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") || "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const entries = payload.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value;

      const statuses = value.statuses || [];
      for (const status of statuses) {
        const waMessageId = status.id;
        const newStatus = mapStatus(status.status);
        if (waMessageId && newStatus) {
          await db.update(messages).set({ status: newStatus }).where(eq(messages.externalId, waMessageId));
        }
      }

      const incomingMessages = value.messages || [];
      for (const msg of incomingMessages) {
        const phone = msg.from;
        const body = msg.text?.body || msg.caption || "[media]";
        const phoneSuffix = phone.slice(-10);

        const [lead] = await db.select().from(leads).where(like(leads.phone, `%${phoneSuffix}`)).limit(1);

        if (lead) {
          await db.insert(messages).values({
            id: createId(),
            leadId: lead.id,
            channel: "whatsapp",
            body,
            status: "delivered",
            direction: "inbound",
            externalId: msg.id,
            sentAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

function mapStatus(waStatus: string): string | null {
  const map: Record<string, string> = { sent: "sent", delivered: "delivered", read: "read", failed: "failed" };
  return map[waStatus] || null;
}
