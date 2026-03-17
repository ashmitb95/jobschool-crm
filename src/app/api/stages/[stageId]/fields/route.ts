import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stages, stageFields } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireAuth, userHasPipelineAccess } from "@/lib/auth";
import { apiForbidden, apiNotFound, apiError } from "@/lib/api-response";

async function getStageAndVerifyAccess(stageId: string, user: { id: string; role: string; orgId: string | null }) {
  const [stage] = await db
    .select({ id: stages.id, pipelineId: stages.pipelineId })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);

  if (!stage) return { error: apiNotFound("Stage not found") };

  if (!stage.pipelineId) {
    return { error: apiForbidden("Stage has no pipeline assigned") };
  }

  const hasAccess = await userHasPipelineAccess(user.id, user.role, user.orgId, stage.pipelineId);
  if (!hasAccess) {
    return { error: apiForbidden("You do not have access to this pipeline") };
  }

  return { stage };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { stageId } = await params;
  const result = await getStageAndVerifyAccess(stageId, user);
  if ("error" in result) return result.error;

  const fields = await db
    .select()
    .from(stageFields)
    .where(eq(stageFields.stageId, stageId))
    .orderBy(asc(stageFields.order));

  return NextResponse.json(fields);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { stageId } = await params;
  const result = await getStageAndVerifyAccess(stageId, user);
  if ("error" in result) return result.error;

  const { name, fieldType, required, options } = await request.json();

  if (!name || !fieldType) {
    return apiError("name and fieldType are required", 400);
  }

  const fieldKey = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const existing = await db
    .select({ order: stageFields.order })
    .from(stageFields)
    .where(eq(stageFields.stageId, stageId))
    .orderBy(asc(stageFields.order));
  const maxOrder = existing.length > 0 ? existing[existing.length - 1].order : -1;

  const id = createId();
  await db.insert(stageFields).values({
    id,
    stageId,
    name,
    fieldKey,
    fieldType,
    required: required ?? false,
    options: options ? JSON.stringify(options) : null,
    order: maxOrder + 1,
  });

  return NextResponse.json({ id, name, fieldKey, fieldType, required: required ?? false, order: maxOrder + 1 }, { status: 201 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { stageId } = await params;
  const result = await getStageAndVerifyAccess(stageId, user);
  if ("error" in result) return result.error;

  const { fields } = await request.json();

  if (!Array.isArray(fields)) {
    return apiError("fields array is required", 400);
  }

  // Delete existing fields for this stage
  await db.delete(stageFields).where(eq(stageFields.stageId, stageId));

  // Re-insert all fields
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    await db.insert(stageFields).values({
      id: f.id || createId(),
      stageId,
      name: f.name,
      fieldKey: f.fieldKey || f.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      fieldType: f.fieldType,
      required: f.required ?? false,
      options: f.options ? (typeof f.options === "string" ? f.options : JSON.stringify(f.options)) : null,
      order: i,
    });
  }

  return NextResponse.json({ success: true });
}
