import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

// POST /api/leads/bulk-assign — Assign multiple leads to an owner
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const { leadIds, ownerId } = body;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return apiError("leadIds array is required", 400);
  }
  if (ownerId === undefined) {
    return apiError("ownerId is required (use null to unassign)", 400);
  }

  const now = new Date().toISOString();
  await db
    .update(leads)
    .set({ ownerId: ownerId || null, updatedAt: now })
    .where(inArray(leads.id, leadIds));

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "leads.bulk_assigned",
    entityType: "lead",
    metadata: { leadCount: leadIds.length, ownerId },
  });

  return apiSuccess({ assigned: leadIds.length });
}
