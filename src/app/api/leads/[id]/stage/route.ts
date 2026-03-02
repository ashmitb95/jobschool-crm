import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendStageMessage } from "@/lib/message-engine";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { stageId } = await req.json();

  if (!stageId) {
    return NextResponse.json({ error: "stageId is required" }, { status: 400 });
  }

  await db.update(leads).set({ stageId, updatedAt: new Date().toISOString() }).where(eq(leads.id, id));

  sendStageMessage(id, stageId).catch(console.error);

  return NextResponse.json({ success: true, leadId: id, stageId });
}
