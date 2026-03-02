import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, stages } from "@/lib/db/schema";
import { eq, like, and, gte, lte, desc, asc, count, or } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { sendStageMessage } from "@/lib/message-engine";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const search = params.get("search") || undefined;
  const stageId = params.get("stageId") || undefined;
  const source = params.get("source") || undefined;
  const dateFrom = params.get("dateFrom") || undefined;
  const dateTo = params.get("dateTo") || undefined;
  const page = parseInt(params.get("page") || "1");
  const limit = parseInt(params.get("limit") || "20");
  const sortBy = params.get("sortBy") || "newest";

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(leads.name, `%${search}%`),
        like(leads.email, `%${search}%`),
        like(leads.phone, `%${search}%`)
      )
    );
  }
  if (stageId) conditions.push(eq(leads.stageId, stageId));
  if (source) conditions.push(eq(leads.source, source));
  if (dateFrom) conditions.push(gte(leads.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(leads.createdAt, dateTo));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

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
        notes: leads.notes,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        stageName: stages.name,
        stageColor: stages.color,
        stageOrder: stages.order,
      })
      .from(leads)
      .leftJoin(stages, eq(leads.stageId, stages.id))
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
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, email, source, notes, stageId } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  let assignStageId = stageId;
  if (!assignStageId) {
    const [defaultStage] = await db.select().from(stages).where(eq(stages.isDefault, true)).limit(1);
    if (!defaultStage) {
      return NextResponse.json({ error: "No default stage configured" }, { status: 500 });
    }
    assignStageId = defaultStage.id;
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
    createdAt: now,
    updatedAt: now,
  });

  // Fire welcome message
  sendStageMessage(id, assignStageId).catch(console.error);

  const [lead] = await db
    .select({
      id: leads.id, name: leads.name, email: leads.email, phone: leads.phone,
      source: leads.source, stageId: leads.stageId, notes: leads.notes,
      createdAt: leads.createdAt, stageName: stages.name, stageColor: stages.color,
    })
    .from(leads)
    .leftJoin(stages, eq(leads.stageId, stages.id))
    .where(eq(leads.id, id));

  return NextResponse.json(lead, { status: 201 });
}
