import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userPipelines, pipelines } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { apiSuccess, apiCreated, apiError, apiValidationError } from "@/lib/api-response";
import { createUserSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { createId } from "@paralleldrive/cuid2";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const orgUsers = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      orgId: users.orgId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(and(eq(users.orgId, admin.orgId!), isNull(users.deletedAt)));

  // Fetch pipeline assignments for all users in the org
  const userIds = orgUsers.map((u) => u.id);
  let pipelineAssignments: { userId: string; pipelineId: string; pipelineName: string }[] = [];

  if (userIds.length > 0) {
    pipelineAssignments = await db
      .select({
        userId: userPipelines.userId,
        pipelineId: pipelines.id,
        pipelineName: pipelines.name,
      })
      .from(userPipelines)
      .innerJoin(pipelines, eq(userPipelines.pipelineId, pipelines.id))
      .where(and(inArray(userPipelines.userId, userIds), isNull(pipelines.deletedAt)));
  }

  // Group pipelines by userId
  const pipelinesByUser: Record<string, { id: string; name: string }[]> = {};
  for (const assignment of pipelineAssignments) {
    if (!pipelinesByUser[assignment.userId]) {
      pipelinesByUser[assignment.userId] = [];
    }
    pipelinesByUser[assignment.userId].push({ id: assignment.pipelineId, name: assignment.pipelineName });
  }

  const usersWithPipelines = orgUsers.map((u) => ({
    ...u,
    pipelines: pipelinesByUser[u.id] || [],
  }));

  return apiSuccess(usersWithPipelines);
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { username, password, displayName, email, role } = parsed.data;

  // Check for duplicate username
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing) {
    return apiError("Username already exists", 409);
  }

  const id = createId();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await db.insert(users).values({
    id,
    username,
    email: email || null,
    passwordHash,
    displayName,
    role,
    orgId: admin.orgId,
    createdAt: now,
    updatedAt: now,
  });

  const [newUser] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      orgId: users.orgId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  await logAudit({
    userId: admin.id,
    orgId: admin.orgId,
    action: "user.created",
    entityType: "user",
    entityId: id,
    metadata: { username, role, createdBy: admin.username },
  });

  return apiCreated(newUser);
}
