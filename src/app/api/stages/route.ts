import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stages, leads } from "@/lib/db/schema";
import { asc, eq, count } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export async function GET() {
  const rows = await db
    .select({
      id: stages.id,
      name: stages.name,
      order: stages.order,
      color: stages.color,
      templateId: stages.templateId,
      isDefault: stages.isDefault,
      createdAt: stages.createdAt,
      leadCount: count(leads.id),
    })
    .from(stages)
    .leftJoin(leads, eq(stages.id, leads.stageId))
    .groupBy(stages.id)
    .orderBy(asc(stages.order));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { name, color, order } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const allStages = await db.select({ order: stages.order }).from(stages).orderBy(asc(stages.order));
  const maxOrder = allStages.length > 0 ? allStages[allStages.length - 1].order : -1;

  const id = createId();
  await db.insert(stages).values({
    id,
    name,
    color: color || "#6b7280",
    order: order ?? maxOrder + 1,
  });

  return NextResponse.json({ id, name, color: color || "#6b7280", order: order ?? maxOrder + 1 }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { stages: stageUpdates } = await req.json();

  for (const s of stageUpdates as Array<{ id: string; order: number; name?: string; color?: string }>) {
    const updates: Record<string, unknown> = { order: s.order };
    if (s.name) updates.name = s.name;
    if (s.color) updates.color = s.color;
    await db.update(stages).set(updates).where(eq(stages.id, s.id));
  }

  return NextResponse.json({ success: true });
}
