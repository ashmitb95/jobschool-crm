import { NextRequest, NextResponse } from "next/server";
import { sendManualMessage } from "@/lib/message-engine";

export async function POST(req: NextRequest) {
  const { leadId, body, channel } = await req.json();

  if (!leadId || !body) {
    return NextResponse.json({ error: "leadId and body are required" }, { status: 400 });
  }

  const message = await sendManualMessage(leadId, body, channel);

  if (!message) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(message, { status: 201 });
}
