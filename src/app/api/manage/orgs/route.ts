import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { organizations, users, pipelines } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/auth";
import { apiSuccess, apiCreated, apiError, apiValidationError } from "@/lib/api-response";
import { createOrgSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

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
    .from(organizations);

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

// POST /api/manage/orgs — Create a new organization
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

  const [org] = await db
    .insert(organizations)
    .values({ name, slug })
    .returning();

  await logAudit({
    userId: auth.id,
    orgId: org.id,
    action: "org.created",
    entityType: "organization",
    entityId: org.id,
    metadata: { name, slug },
  });

  return apiCreated({
    ...org,
    settings: org.settings ? JSON.parse(org.settings) : null,
  });
}
