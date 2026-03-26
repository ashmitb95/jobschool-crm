import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { organizations, users, pipelines, stages, stageTransitions, messageTemplates, stageFields } from "@/lib/db/schema";
import { eq, count, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireSuperAdmin, hashPassword } from "@/lib/auth";
import { apiSuccess, apiCreated, apiError, apiValidationError } from "@/lib/api-response";
import { createOrgSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

// GET /api/manage/orgs — List all organizations with user count and pipeline count
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      settings: organizations.settings,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
    })
    .from(organizations)
    .where(isNull(organizations.deletedAt));

  const orgIds = orgs.map((o) => o.id);

  // Get user counts per org
  const userCounts = await Promise.all(
    orgIds.map(async (orgId) => {
      const [result] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.orgId, orgId));
      return { orgId, count: result?.count ?? 0 };
    })
  );

  // Get pipeline counts per org
  const pipelineCounts = await Promise.all(
    orgIds.map(async (orgId) => {
      const [result] = await db
        .select({ count: count() })
        .from(pipelines)
        .where(eq(pipelines.orgId, orgId));
      return { orgId, count: result?.count ?? 0 };
    })
  );

  const userCountMap = Object.fromEntries(userCounts.map((u) => [u.orgId, u.count]));
  const pipelineCountMap = Object.fromEntries(pipelineCounts.map((p) => [p.orgId, p.count]));

  const data = orgs.map((org) => ({
    ...org,
    settings: org.settings ? JSON.parse(org.settings) : null,
    userCount: userCountMap[org.id] ?? 0,
    pipelineCount: pipelineCountMap[org.id] ?? 0,
  }));

  return apiSuccess(data);
}

// POST /api/manage/orgs — Create a new organization with full provisioning
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { name, slug } = parsed.data;

  // Check slug uniqueness
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (existing) {
    return apiError("An organization with this slug already exists", 409);
  }

  // 1. Create org
  const pipelineId = createId();
  const [org] = await db
    .insert(organizations)
    .values({
      name,
      slug,
      settings: JSON.stringify({ defaultPipelineId: pipelineId }),
    })
    .returning();

  // 2. Create admin user
  const generatedPassword = `${slug}123`;
  const adminUsername = `${slug}-admin`;
  const passwordHash = await hashPassword(generatedPassword);
  const [adminUser] = await db.insert(users).values({
    username: adminUsername,
    passwordHash,
    displayName: `${name} Admin`,
    role: "admin",
    orgId: org.id,
    mustChangePassword: true,
  }).returning();

  // 3. Create default pipeline
  const now = new Date().toISOString();
  await db.insert(pipelines).values({
    id: pipelineId,
    name: "Default Pipeline",
    orgId: org.id,
    createdAt: now,
    updatedAt: now,
  });

  // 4. Create default stages
  const stageConfigs = [
    { name: "New Lead", order: 0, color: "#4aab78", isDefault: true },
    { name: "Contacted", order: 1, color: "#5a9be0", isDefault: false },
    { name: "Qualified", order: 2, color: "#d4a94e", isDefault: false },
    { name: "Converted", order: 3, color: "#4aab78", isDefault: false },
    { name: "Lost", order: 4, color: "#dc4a3a", isDefault: false },
  ];

  const stageIds: string[] = [];
  for (const sc of stageConfigs) {
    const id = createId();
    stageIds.push(id);
    await db.insert(stages).values({
      id,
      name: sc.name,
      order: sc.order,
      color: sc.color,
      isDefault: sc.isDefault,
      pipelineId,
      createdAt: now,
    });
  }

  // 5. Create default transitions: linear flow + any → Lost
  const transitions = [
    [0, 1], [1, 2], [2, 3], // New Lead → Contacted → Qualified → Converted
    [0, 4], [1, 4], [2, 4], [3, 4], // any → Lost
  ];
  for (const [from, to] of transitions) {
    await db.insert(stageTransitions).values({
      fromStageId: stageIds[from],
      toStageId: stageIds[to],
      createdAt: now,
    });
  }

  // 6. Create default templates for each stage
  const templateConfigs = [
    { stage: 0, name: "Welcome", body: `Hi {{name}}! Welcome to ${name}. We're excited to help you on your journey.` },
    { stage: 1, name: "Follow-up", body: `Hi {{name}}, this is a follow-up from ${name}. We tried reaching out — please let us know a good time to connect.` },
    { stage: 2, name: "Qualified", body: `Great news {{name}}! You've been shortlisted by ${name}. We'll be in touch with next steps shortly.` },
    { stage: 3, name: "Converted", body: `Congratulations {{name}}! Welcome aboard. The ${name} team is thrilled to have you. We'll share onboarding details soon.` },
    { stage: 4, name: "Closed", body: `Hi {{name}}, thank you for your interest in ${name}. Unfortunately we're unable to move forward at this time. We wish you all the best.` },
  ];
  for (const tc of templateConfigs) {
    const tplId = createId();
    await db.insert(messageTemplates).values({
      id: tplId,
      name: tc.name,
      body: tc.body,
      channel: "whatsapp",
      orgId: org.id,
      createdAt: now,
      updatedAt: now,
    });
    await db.update(stages).set({ templateId: tplId }).where(eq(stages.id, stageIds[tc.stage]));
  }

  // 7. Add default mandatory field to each non-default stage
  const stageFieldConfigs = [
    // No field for New Lead (index 0) — it's the entry stage
    { stage: 1, name: "Contact Notes", fieldKey: "contact_notes", fieldType: "textarea" },
    { stage: 2, name: "Qualification Notes", fieldKey: "qualification_notes", fieldType: "textarea" },
    { stage: 3, name: "Conversion Details", fieldKey: "conversion_details", fieldType: "textarea" },
    { stage: 4, name: "Reason for Loss", fieldKey: "loss_reason", fieldType: "textarea" },
  ];
  for (const sf of stageFieldConfigs) {
    await db.insert(stageFields).values({
      id: createId(),
      stageId: stageIds[sf.stage],
      name: sf.name,
      fieldKey: sf.fieldKey,
      fieldType: sf.fieldType,
      required: true,
      order: 0,
      createdAt: now,
    });
  }

  await logAudit({
    userId: auth.id,
    orgId: org.id,
    action: "org.created",
    entityType: "organization",
    entityId: org.id,
    metadata: { name, slug, autoProvisioned: true },
  });

  return apiCreated({
    ...org,
    settings: org.settings ? JSON.parse(org.settings) : null,
    admin: {
      username: adminUsername,
      password: generatedPassword,
    },
    pipelineCount: 1,
    stageCount: stageConfigs.length,
  });
}
