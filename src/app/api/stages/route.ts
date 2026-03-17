import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stages, leads, stageFields } from "@/lib/db/schema";
import { asc, eq, count, and, isNull, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireAuth, getUserPipelineIds, userHasPipelineAccess } from "@/lib/auth";
import { apiError, apiForbidden, apiValidationError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { createStageSchema, bulkUpdateStagesSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const pipelineId = request.nextUrl.searchParams.get("pipelineId");

  if (!pipelineId) {
    return apiError("pipelineId query parameter is required", 400);
  }

  const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, pipelineId);
  if (!hasAccess) {
    return apiForbidden("You do not have access to this pipeline");
  }

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
    .leftJoin(leads, and(eq(stages.id, leads.stageId), isNull(leads.deletedAt)))
    .where(eq(stages.pipelineId, pipelineId))
    .groupBy(stages.id)
    .orderBy(asc(stages.order));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const body = await request.json();
  const parsed = createStageSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { name, color, order, pipelineId } = parsed.data;

  const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, pipelineId);
  if (!hasAccess) {
    return apiForbidden("You do not have access to this pipeline");
  }

  const allStages = await db
    .select({ order: stages.order })
    .from(stages)
    .where(eq(stages.pipelineId, pipelineId))
    .orderBy(asc(stages.order));
  const maxOrder = allStages.length > 0 ? allStages[allStages.length - 1].order : -1;

  const id = createId();
  await db.insert(stages).values({
    id,
    name,
    color: color || "#6b7280",
    order: order ?? maxOrder + 1,
    pipelineId,
  });

  // Auto-create default "Notes" field for the new stage
  await db.insert(stageFields).values({
    id: createId(),
    stageId: id,
    name: "Notes",
    fieldKey: "notes",
    fieldType: "textarea",
    required: false,
    order: 0,
  });

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "stage.created",
    entityType: "stage",
    entityId: id,
    metadata: { name, pipelineId },
  });

  return NextResponse.json({ id, name, color: color || "#6b7280", order: order ?? maxOrder + 1, pipelineId }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const body = await request.json();
  const parsed = bulkUpdateStagesSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { stages: stageUpdates } = parsed.data;

  // Verify all stages belong to accessible pipelines
  const userPipelineIds = await getUserPipelineIds(user.id, user.role, user.orgId);
  for (const s of stageUpdates) {
    const [stage] = await db.select({ pipelineId: stages.pipelineId }).from(stages).where(eq(stages.id, s.id)).limit(1);
    if (!stage || !stage.pipelineId || !userPipelineIds.includes(stage.pipelineId)) {
      return apiForbidden(`No access to stage ${s.id}`);
    }
  }

  for (const s of stageUpdates) {
    const updates: Record<string, unknown> = { order: s.order };
    if (s.name) updates.name = s.name;
    if (s.color) updates.color = s.color;
    await db.update(stages).set(updates).where(eq(stages.id, s.id));
  }

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "stages.reordered",
    entityType: "stage",
    metadata: { stageIds: stageUpdates.map((s) => s.id) },
  });

  return NextResponse.json({ success: true });
}
