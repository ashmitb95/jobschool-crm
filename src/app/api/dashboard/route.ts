import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, stages, users, messages, leadActivities } from "@/lib/db/schema";
import { eq, and, gte, isNull, count, desc, sql, inArray } from "drizzle-orm";
import { requireAuth, getUserPipelineIds } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (user instanceof NextResponse) return user;

  const pipelineId = req.nextUrl.searchParams.get("pipelineId");
  if (!pipelineId) return apiError("pipelineId is required", 400);

  const pipelineIds = await getUserPipelineIds(user.id, user.role, user.orgId);
  if (!pipelineIds.includes(pipelineId)) return apiError("No access", 403);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const staleCutoff = new Date(now.getTime() - 3 * 86400000).toISOString();

  const baseCond = and(eq(leads.pipelineId, pipelineId), isNull(leads.deletedAt));
  // Members only see their own leads
  const memberCond = user.role === "member"
    ? and(baseCond, eq(leads.ownerId, user.id))
    : baseCond;

  // Run all queries in parallel
  const [
    totalResult,
    todayResult,
    weekResult,
    monthResult,
    stageBreakdown,
    sourceBreakdown,
    staleResult,
    unassignedResult,
    ownerBreakdown,
    dailyInflow,
    recentActivity,
    messageCount,
    bdStageMatrix,
  ] = await Promise.all([
    // Total leads
    db.select({ count: count() }).from(leads).where(memberCond),

    // New today
    db.select({ count: count() }).from(leads).where(and(memberCond, gte(leads.createdAt, todayStart))),

    // New this week
    db.select({ count: count() }).from(leads).where(and(memberCond, gte(leads.createdAt, weekStart))),

    // New this month
    db.select({ count: count() }).from(leads).where(and(memberCond, gte(leads.createdAt, monthStart))),

    // Leads per stage
    db.select({
      stageId: leads.stageId,
      stageName: stages.name,
      stageColor: stages.color,
      stageOrder: stages.order,
      count: count(),
    })
      .from(leads)
      .innerJoin(stages, eq(leads.stageId, stages.id))
      .where(memberCond)
      .groupBy(leads.stageId, stages.name, stages.color, stages.order),

    // Leads per source
    db.select({ source: leads.source, count: count() })
      .from(leads).where(memberCond).groupBy(leads.source),

    // Stale leads (not updated in 3+ days, not in terminal stages)
    db.select({ count: count() }).from(leads)
      .innerJoin(stages, eq(leads.stageId, stages.id))
      .where(and(
        memberCond,
        sql`${leads.updatedAt} < ${staleCutoff}`,
        sql`${stages.order} < (SELECT MAX(s2."order") FROM stages s2 WHERE s2.pipeline_id = ${pipelineId})`,
      )),

    // Unassigned leads
    db.select({ count: count() }).from(leads)
      .where(and(baseCond, isNull(leads.ownerId))),

    // Leads per owner (BD performance)
    user.role === "admin"
      ? db.select({
          ownerId: leads.ownerId,
          ownerName: users.displayName,
          count: count(),
        })
          .from(leads)
          .leftJoin(users, eq(leads.ownerId, users.id))
          .where(baseCond)
          .groupBy(leads.ownerId, users.displayName)
      : Promise.resolve([]),

    // Daily lead inflow (last 30 days)
    db.select({
      date: sql<string>`date(${leads.createdAt})`.as("date"),
      count: count(),
    })
      .from(leads)
      .where(and(memberCond, gte(leads.createdAt, thirtyDaysAgo)))
      .groupBy(sql`date(${leads.createdAt})`)
      .orderBy(sql`date(${leads.createdAt})`),

    // Recent activity (last 20 actions)
    db.select({
      id: leadActivities.id,
      action: leadActivities.action,
      description: leadActivities.description,
      createdAt: leadActivities.createdAt,
      leadId: leadActivities.leadId,
      userName: users.displayName,
    })
      .from(leadActivities)
      .leftJoin(users, eq(leadActivities.userId, users.id))
      .innerJoin(leads, eq(leadActivities.leadId, leads.id))
      .where(eq(leads.pipelineId, pipelineId))
      .orderBy(desc(leadActivities.createdAt))
      .limit(20),

    // Messages sent
    db.select({ count: count() }).from(messages)
      .innerJoin(leads, eq(messages.leadId, leads.id))
      .where(and(eq(leads.pipelineId, pipelineId), eq(messages.direction, "outbound"))),

    // BD x Stage matrix (admin only)
    user.role === "admin"
      ? db.select({
          ownerId: leads.ownerId,
          ownerName: users.displayName,
          stageId: leads.stageId,
          stageName: stages.name,
          stageOrder: stages.order,
          count: count(),
        })
          .from(leads)
          .leftJoin(users, eq(leads.ownerId, users.id))
          .innerJoin(stages, eq(leads.stageId, stages.id))
          .where(baseCond)
          .groupBy(leads.ownerId, users.displayName, leads.stageId, stages.name, stages.order)
      : Promise.resolve([]),
  ]);

  // Compute conversion rate
  const sortedStages = [...stageBreakdown].sort((a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0));
  const totalLeads = totalResult[0]?.count || 0;
  // Find "converted" stage (second to last, before Lost)
  const convertedStage = sortedStages.length >= 2 ? sortedStages[sortedStages.length - 2] : null;
  const convertedCount = convertedStage?.count || 0;
  const conversionRate = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;

  return apiSuccess({
    summary: {
      totalLeads,
      newToday: todayResult[0]?.count || 0,
      newThisWeek: weekResult[0]?.count || 0,
      newThisMonth: monthResult[0]?.count || 0,
      messagesSent: messageCount[0]?.count || 0,
      conversionRate,
      staleLeads: staleResult[0]?.count || 0,
      unassignedLeads: unassignedResult[0]?.count || 0,
    },
    stageBreakdown: sortedStages,
    sourceBreakdown,
    ownerBreakdown: Array.isArray(ownerBreakdown) ? ownerBreakdown : [],
    dailyInflow,
    recentActivity,
    bdStageMatrix: Array.isArray(bdStageMatrix) ? bdStageMatrix : [],
  });
}
