import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, stages, users } from "@/lib/db/schema";
import { eq, like, and, gte, lte, desc, asc, count, or, isNull, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { sendStageMessage } from "@/lib/message-engine";
import { requireAuth, requireAdmin, getUserPipelineIds, userHasPipelineAccess } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-response";
import { createLeadSchema } from "@/lib/validations";
import { logAudit, logLeadActivity } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (user instanceof NextResponse) return user;

  const params = req.nextUrl.searchParams;
  const pipelineId = params.get("pipelineId") || undefined;
  const search = params.get("search") || undefined;
  const stageId = params.get("stageId") || undefined;
  const source = params.get("source") || undefined;
  const dateFrom = params.get("dateFrom") || undefined;
  const dateTo = params.get("dateTo") || undefined;
  const page = parseInt(params.get("page") || "1");
  const limit = parseInt(params.get("limit") || "20");
  const sortBy = params.get("sortBy") || "newest";

  const conditions = [isNull(leads.deletedAt)];

  // Members only see leads assigned to them
  if (user.role === "member") {
    conditions.push(eq(leads.ownerId, user.id));
  }

  // Pipeline scoping
  if (pipelineId) {
    const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, pipelineId);
    if (!hasAccess) return apiError("No access to this pipeline", 403);
    conditions.push(eq(leads.pipelineId, pipelineId));
  } else {
    const pipelineIds = await getUserPipelineIds(user.id, user.role, user.orgId);
    if (pipelineIds.length === 0) {
      return NextResponse.json({ leads: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }
    conditions.push(inArray(leads.pipelineId, pipelineIds));
  }

  if (search) {
    conditions.push(
      or(
        like(leads.name, `%${search}%`),
        like(leads.email, `%${search}%`),
        like(leads.phone, `%${search}%`)
      )!
    );
  }
  if (stageId) conditions.push(eq(leads.stageId, stageId));
  if (source) conditions.push(eq(leads.source, source));
  if (dateFrom) conditions.push(gte(leads.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(leads.createdAt, dateTo));

  const where = and(...conditions);

  const orderCol =
    sortBy === "oldest" ? asc(leads.createdAt) :
    sortBy === "name" ? asc(leads.name) :
    desc(leads.createdAt);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        source: leads.source,
        stageId: leads.stageId,
        pipelineId: leads.pipelineId,
        ownerId: leads.ownerId,
        notes: leads.notes,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        stageName: stages.name,
        stageColor: stages.color,
        stageOrder: stages.order,
        ownerName: users.displayName,
      })
      .from(leads)
      .leftJoin(stages, eq(leads.stageId, stages.id))
      .leftJoin(users, eq(leads.ownerId, users.id))
      .where(where)
      .orderBy(orderCol)
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(leads).where(where),
  ]);

  const total = totalRows[0]?.count || 0;

  return NextResponse.json({
    leads: rows.map((r) => ({
      ...r,
      stage: { id: r.stageId, name: r.stageName, color: r.stageColor, order: r.stageOrder },
      owner: r.ownerId ? { id: r.ownerId, displayName: r.ownerName } : null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { name, phone, email, source, notes, stageId, pipelineId } = parsed.data;

  const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, pipelineId);
  if (!hasAccess) return apiError("No access to this pipeline", 403);

  let assignStageId = stageId;
  if (!assignStageId) {
    const [defaultStage] = await db
      .select()
      .from(stages)
      .where(and(eq(stages.pipelineId, pipelineId), eq(stages.isDefault, true)))
      .limit(1);
    if (!defaultStage) {
      // Fall back to first stage in pipeline
      const [firstStage] = await db
        .select()
        .from(stages)
        .where(eq(stages.pipelineId, pipelineId))
        .orderBy(asc(stages.order))
        .limit(1);
      if (!firstStage) return apiError("No stages configured for this pipeline", 400);
      assignStageId = firstStage.id;
    } else {
      assignStageId = defaultStage.id;
    }
  }

  const id = createId();
  const now = new Date().toISOString();
  await db.insert(leads).values({
    id,
    name,
    phone,
    email: email || null,
    source: source || "manual",
    notes: notes || null,
    stageId: assignStageId,
    pipelineId,
    ownerId: user.id, // Auto-assign to the admin who created the lead
    createdAt: now,
    updatedAt: now,
  });

  sendStageMessage(id, assignStageId).catch(console.error);

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "lead.created",
    entityType: "lead",
    entityId: id,
    metadata: { name, pipelineId },
  });

  await logLeadActivity({
    leadId: id,
    userId: user.id,
    action: "created",
    description: `Lead created by ${user.displayName}`,
  });

  const [lead] = await db
    .select({
      id: leads.id, name: leads.name, email: leads.email, phone: leads.phone,
      source: leads.source, stageId: leads.stageId, pipelineId: leads.pipelineId,
      notes: leads.notes, createdAt: leads.createdAt, stageName: stages.name, stageColor: stages.color,
    })
    .from(leads)
    .leftJoin(stages, eq(leads.stageId, stages.id))
    .where(eq(leads.id, id));

  return NextResponse.json(lead, { status: 201 });
}
