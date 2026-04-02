import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/channels";
import type { OrgSettings } from "@/types";

// POST /api/integrations/test — send test message
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const { channel, to } = body;

  if (!channel || !to) {
    return NextResponse.json({ success: false, error: { message: "channel and to are required" } }, { status: 400 });
  }

  const provider = getProvider(channel);
  if (!provider) {
    return NextResponse.json({ success: false, error: { message: `Unknown channel: ${channel}` } }, { status: 400 });
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId!)).limit(1);
  const settings: OrgSettings = org?.settings ? JSON.parse(org.settings) : {};

  let result;
  if (channel === "email") {
    result = await provider.send({
      to,
      subject: "Test Email from LeadLynx",
      body: `<div style="font-family:Arial,sans-serif;padding:20px;"><h2 style="color:#e8622a;">Hello from LeadLynx!</h2><p>This is a test email to verify your email integration is working correctly.</p></div>`,
    }, settings);
  } else {
    result = await provider.send({
      to,
      body: "Hello from LeadLynx! This is a test message to verify your integration is working correctly.",
    }, settings);
  }

  if (result.success) {
    return NextResponse.json({ success: true, data: { externalId: result.externalId } });
  } else {
    return NextResponse.json({ success: false, error: { message: result.error || "Send failed" } }, { status: 500 });
  }
}
