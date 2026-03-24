import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { metaFormMappings, pipelines, leads, stages, organizations } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireAdmin } from "@/lib/auth";
import { updateFormMappingsSchema } from "@/lib/validations";
import type { OrgSettings } from "@/types";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (user instanceof NextResponse) return user;

  const mappings = await db
    .select({
      id: metaFormMappings.id,
      formId: metaFormMappings.formId,
      formName: metaFormMappings.formName,
      pipelineId: metaFormMappings.pipelineId,
      pipelineName: pipelines.name,
    })
    .from(metaFormMappings)
    .innerJoin(pipelines, eq(metaFormMappings.pipelineId, pipelines.id))
    .where(eq(metaFormMappings.orgId, user.orgId!));

  return NextResponse.json({ success: true, data: { mappings } });
}

export async function PUT(req: NextRequest) {
  const user = await requireAdmin(req);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = updateFormMappingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
  }

  const { mappings, migrate } = parsed.data;

  // Validate: no duplicate formIds
  const formIds = mappings.map((m) => m.formId);
  if (new Set(formIds).size !== formIds.length) {
    return NextResponse.json({
      success: false,
      error: { message: "A form can only be mapped to one pipeline" },
    }, { status: 400 });
  }

  // Validate: all pipelineIds belong to this org
  const orgPipelines = await db
    .select({ id: pipelines.id })
    .from(pipelines)
    .where(and(eq(pipelines.orgId, user.orgId!), isNull(pipelines.deletedAt)));
  const validPipelineIds = new Set(orgPipelines.map((p) => p.id));

  for (const m of mappings) {
    if (!validPipelineIds.has(m.pipelineId)) {
      return NextResponse.json({
        success: false,
        error: { message: `Pipeline ${m.pipelineId} does not belong to your organization` },
      }, { status: 400 });
    }
  }

  // Delete existing mappings for this org
  await db.delete(metaFormMappings).where(eq(metaFormMappings.orgId, user.orgId!));

  // Insert new mappings
  const now = new Date().toISOString();
  for (const m of mappings) {
    await db.insert(metaFormMappings).values({
      id: createId(),
      orgId: user.orgId!,
      formId: m.formId,
      formName: m.formName || null,
      pipelineId: m.pipelineId,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Migrate existing leads if requested
  let migratedCount = 0;
  if (migrate && mappings.length > 0) {
    // Get org's default pipeline
    const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId!)).limit(1);
    const settings: OrgSettings = org?.settings ? JSON.parse(org.settings) : {};
    const defaultPipelineId = settings.defaultPipelineId || orgPipelines[0]?.id;

    if (defaultPipelineId) {
      for (const m of mappings) {
        if (m.pipelineId === defaultPipelineId) continue; // No need to migrate to the same pipeline

        // Find the default stage in the target pipeline
        const [targetStage] = await db
          .select()
          .from(stages)
          .where(and(eq(stages.pipelineId, m.pipelineId), eq(stages.isDefault, true)))
          .limit(1);

        if (!targetStage) continue;

        // Move leads whose metadata.formName matches
        const formName = m.formName || "";
        if (!formName) continue;

        const result = await db.run(
          sql`UPDATE leads SET pipeline_id = ${m.pipelineId}, stage_id = ${targetStage.id}, updated_at = ${now} WHERE pipeline_id = ${defaultPipelineId} AND json_extract(metadata, '$.formName') = ${formName}`
        );
        migratedCount += result.rowsAffected;
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { saved: mappings.length, migrated: migratedCount },
  });
}
