import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { organizations, users, pipelines } from "@/lib/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/auth";
import { apiSuccess, apiError, apiNotFound, apiValidationError } from "@/lib/api-response";
import { updateOrgSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

// GET /api/manage/orgs/[orgId] — Org details including users and pipelines arrays
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const { orgId } = await params;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) return apiNotFound("Organization not found");

  const orgUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      deletedAt: users.deletedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.orgId, orgId));

  const orgPipelines = await db
    .select({
      id: pipelines.id,
      name: pipelines.name,
      description: pipelines.description,
      deletedAt: pipelines.deletedAt,
      createdAt: pipelines.createdAt,
    })
    .from(pipelines)
    .where(eq(pipelines.orgId, orgId));

  return apiSuccess({
    ...org,
    settings: org.settings ? JSON.parse(org.settings) : null,
    users: orgUsers,
    pipelines: orgPipelines,
  });
}

// PATCH /api/manage/orgs/[orgId] — Update org name/slug/settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const { orgId } = await params;

  const body = await request.json();
  const parsed = updateOrgSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { name, slug, settings } = parsed.data;

  // Verify org exists
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) return apiNotFound("Organization not found");

  // Check slug uniqueness if changed
  if (slug && slug !== org.slug) {
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (existing) {
      return apiError("An organization with this slug already exists", 409);
    }
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (settings !== undefined) updates.settings = JSON.stringify(settings);

  await db
    .update(organizations)
    .set(updates)
    .where(eq(organizations.id, orgId));

  const [updated] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  await logAudit({
    userId: auth.id,
    orgId,
    action: "org.updated",
    entityType: "organization",
    entityId: orgId,
    metadata: { name, slug, settings },
  });

  return apiSuccess({
    ...updated,
    settings: updated.settings ? JSON.parse(updated.settings) : null,
  });
}

// DELETE /api/manage/orgs/[orgId] — Soft-delete (archive) org
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const { orgId } = await params;

  const [org] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.id, orgId), isNull(organizations.deletedAt)))
    .limit(1);

  if (!org) return apiNotFound("Organization not found");

  const now = new Date().toISOString();

  // Soft-delete the org
  await db.update(organizations).set({ deletedAt: now, updatedAt: now }).where(eq(organizations.id, orgId));

  // Soft-delete all org users (blocks login)
  await db.update(users).set({ deletedAt: now, updatedAt: now }).where(eq(users.orgId, orgId));

  // Invalidate all sessions for org users
  const { sessions } = await import("@/lib/db/schema");
  const orgUsers = await db.select({ id: users.id }).from(users).where(eq(users.orgId, orgId));
  for (const u of orgUsers) {
    await db.delete(sessions).where(eq(sessions.userId, u.id));
  }

  await logAudit({
    userId: auth.id,
    orgId: null,
    action: "org.archived",
    entityType: "organization",
    entityId: orgId,
    metadata: { name: org.name, slug: org.slug },
  });

  return apiSuccess({ archived: true });
}
