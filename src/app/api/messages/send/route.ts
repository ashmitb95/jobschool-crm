import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendManualMessage } from "@/lib/message-engine";
import { requireAuth, userHasPipelineAccess } from "@/lib/auth";
import { apiError, apiForbidden, apiNotFound } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { leadId, body, channel } = await request.json();

  if (!leadId || !body) {
    return apiError("leadId and body are required", 400);
  }

  // Verify lead's pipeline access
  const [lead] = await db
    .select({ id: leads.id, pipelineId: leads.pipelineId, deletedAt: leads.deletedAt })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);

  if (!lead || lead.deletedAt) {
    return apiNotFound("Lead not found");
  }

  if (!lead.pipelineId) {
    return apiForbidden("Lead has no pipeline assigned");
  }

  const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, lead.pipelineId);
  if (!hasAccess) {
    return apiForbidden("You do not have access to this lead's pipeline");
  }

  const message = await sendManualMessage(leadId, body, channel);

  if (!message) {
    return apiNotFound("Lead not found");
  }

  return NextResponse.json(message, { status: 201 });
}
