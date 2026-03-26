import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pipelines, stages, leads, metaFormMappings } from "@/lib/db/schema";
import { eq, and, isNull, inArray, count } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireAuth, requireAdmin, getUserPipelineIds } from "@/lib/auth";
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiValidationError,
} from "@/lib/api-response";
import { createPipelineSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

// GET /api/pipelines — list pipelines the user has access to
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof Response) return user;

  try {
    const pipelineIds = await getUserPipelineIds(user.id, user.role, user.orgId);

    if (pipelineIds.length === 0) {
      return apiSuccess([]);
    }

    const rows = await db
      .select({
        id: pipelines.id,
        name: pipelines.name,
        description: pipelines.description,
        orgId: pipelines.orgId,
        createdAt: pipelines.createdAt,
        updatedAt: pipelines.updatedAt,
        stageCount: count(stages.id),
      })
      .from(pipelines)
      .leftJoin(
        stages,
        eq(stages.pipelineId, pipelines.id)
      )
      .where(
        and(inArray(pipelines.id, pipelineIds), isNull(pipelines.deletedAt))
      )
      .groupBy(pipelines.id);

    // Fetch lead counts separately to avoid double-counting from multiple joins
    const leadCounts = await db
      .select({
        pipelineId: leads.pipelineId,
        leadCount: count(leads.id),
      })
      .from(leads)
      .where(
        and(
          inArray(leads.pipelineId, pipelineIds),
          isNull(leads.deletedAt)
        )
      )
      .groupBy(leads.pipelineId);

    const leadCountMap = new Map(
      leadCounts.map((lc) => [lc.pipelineId, lc.leadCount])
    );

    const result = rows.map((row) => ({
      ...row,
      leadCount: leadCountMap.get(row.id) ?? 0,
    }));

    return apiSuccess(result);
  } catch (error) {
    console.error("Failed to list pipelines:", error);
    return apiError("Failed to list pipelines", 500);
  }
}

// POST /api/pipelines — create a new pipeline (admin only)
export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;

  try {
    const body = await request.json();
    const parsed = createPipelineSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { name, description } = parsed.data;

    if (!user.orgId) {
      return apiError("User is not associated with an organization", 400);
    }

    const now = new Date().toISOString();
    const [pipeline] = await db
      .insert(pipelines)
      .values({
        name,
        description: description ?? null,
        orgId: user.orgId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Optionally link forms to this pipeline
    const formIds: string[] = body.formIds || [];
    const formNames: Record<string, string> = body.formNames || {}; // { formId: formName }
    if (formIds.length > 0 && user.orgId) {
      // Remove these forms from other pipeline mappings first
      for (const formId of formIds) {
        await db.delete(metaFormMappings).where(
          and(eq(metaFormMappings.orgId, user.orgId), eq(metaFormMappings.formId, formId))
        );
      }
      const now2 = new Date().toISOString();
      for (const formId of formIds) {
        await db.insert(metaFormMappings).values({
          id: createId(),
          orgId: user.orgId,
          formId,
          formName: formNames[formId] || null,
          pipelineId: pipeline.id,
          createdAt: now2,
          updatedAt: now2,
        });
      }
    }

    await logAudit({
      userId: user.id,
      orgId: user.orgId,
      action: "pipeline.created",
      entityType: "pipeline",
      entityId: pipeline.id,
      metadata: { name, description, formIds },
    });

    return apiCreated(pipeline);
  } catch (error) {
    console.error("Failed to create pipeline:", error);
    return apiError("Failed to create pipeline", 500);
  }
}
