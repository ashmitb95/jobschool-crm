import { db } from "@/lib/db";
import { auditLogs, leadActivities } from "@/lib/db/schema";

interface AuditParams {
  userId?: string | null;
  orgId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams) {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      orgId: params.orgId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });
  } catch (error) {
    console.error("Failed to log audit:", error);
  }
}

interface LeadActivityParams {
  leadId: string;
  userId?: string | null;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function logLeadActivity(params: LeadActivityParams) {
  try {
    await db.insert(leadActivities).values({
      leadId: params.leadId,
      userId: params.userId ?? null,
      action: params.action,
      description: params.description,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });
  } catch (error) {
    console.error("Failed to log lead activity:", error);
  }
}
