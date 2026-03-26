import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSuperAdmin, hashPassword } from "@/lib/auth";
import { apiSuccess, apiCreated, apiError, apiNotFound, apiValidationError } from "@/lib/api-response";
import { createUserSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

// GET /api/manage/orgs/[orgId]/users — List users in this org
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const { orgId } = await params;

  // Verify org exists
  const [org] = await db
    .select({ id: organizations.id })
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
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.orgId, orgId));

  return apiSuccess(orgUsers);
}

// POST /api/manage/orgs/[orgId]/users — Create the initial admin user for an org
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const { orgId } = await params;

  // Verify org exists
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) return apiNotFound("Organization not found");

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { username, password, displayName, email } = parsed.data;

  // Check username uniqueness
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing) {
    return apiError("A user with this username already exists", 409);
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      username,
      passwordHash,
      displayName,
      email: email || null,
      role: "admin", // Force role to admin for initial org user
      orgId,
      mustChangePassword: true,
    })
    .returning();

  await logAudit({
    userId: auth.id,
    orgId,
    action: "user.created",
    entityType: "user",
    entityId: user.id,
    metadata: { username, displayName, role: "admin" },
  });

  return apiCreated({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
    createdAt: user.createdAt,
  });
}
