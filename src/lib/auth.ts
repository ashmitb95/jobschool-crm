import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, sessions, userPipelines, pipelines, organizations } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import type { AuthUser } from "@/types";

const AUTH_SECRET = process.env.AUTH_SECRET || "leadlynx-default-secret-change-me";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Password Hashing ───────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Session Token ──────────────────────────────────────────────────────────

function generateToken(userId: string): string {
  const payload = `${userId}:${Date.now()}:${createId()}`;
  const hmac = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken(userId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function invalidateSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// ─── Session Lookup ─────────────────────────────────────────────────────────

export async function getSessionUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;

  const [session] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      orgId: users.orgId,
      mustChangePassword: users.mustChangePassword,
      deletedAt: users.deletedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  if (!session) return null;

  // Check expired
  if (new Date(session.expiresAt) < new Date()) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }

  // Check soft-deleted user
  if (session.deletedAt) return null;

  return {
    id: session.userId,
    username: session.username,
    displayName: session.displayName,
    role: session.role as AuthUser["role"],
    orgId: session.orgId,
    mustChangePassword: session.mustChangePassword,
  };
}

// ─── Auth Guards ────────────────────────────────────────────────────────────

/** Returns org-level user (admin/member) or 401/403 NextResponse. Rejects super_admin. */
export async function requireAuth(request: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }
  if (user.role === "super_admin") {
    return NextResponse.json(
      { success: false, error: { message: "Super admin cannot access tenant resources", code: "FORBIDDEN" } },
      { status: 403 }
    );
  }
  return user;
}

/** Returns admin user or 403 NextResponse */
export async function requireAdmin(request: NextRequest): Promise<AuthUser | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (result.role !== "admin") {
    return NextResponse.json(
      { success: false, error: { message: "Admin access required", code: "FORBIDDEN" } },
      { status: 403 }
    );
  }
  return result;
}

/** Returns super_admin user or 401/403 NextResponse */
export async function requireSuperAdmin(request: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }
  if (user.role !== "super_admin") {
    return NextResponse.json(
      { success: false, error: { message: "Super admin access required", code: "FORBIDDEN" } },
      { status: 403 }
    );
  }
  return user;
}

// ─── Pipeline Access ────────────────────────────────────────────────────────

/** Get pipeline IDs the user has access to. Admins get all org pipelines. */
export async function getUserPipelineIds(userId: string, role: string, orgId: string | null): Promise<string[]> {
  if (!orgId) return [];

  if (role === "admin") {
    // Admins see all org pipelines
    const orgPipelines = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(and(eq(pipelines.orgId, orgId), isNull(pipelines.deletedAt)));
    return orgPipelines.map((p) => p.id);
  }

  // Members see only assigned pipelines
  const assigned = await db
    .select({ pipelineId: userPipelines.pipelineId })
    .from(userPipelines)
    .innerJoin(pipelines, eq(userPipelines.pipelineId, pipelines.id))
    .where(and(eq(userPipelines.userId, userId), isNull(pipelines.deletedAt)));
  return assigned.map((a) => a.pipelineId);
}

/** Check if user has access to a specific pipeline */
export async function userHasPipelineAccess(userId: string, role: string, orgId: string | null, pipelineId: string): Promise<boolean> {
  const ids = await getUserPipelineIds(userId, role, orgId);
  return ids.includes(pipelineId);
}

/** Get user's accessible pipelines with full details */
export async function getUserPipelines(userId: string, role: string, orgId: string | null) {
  const pipelineIds = await getUserPipelineIds(userId, role, orgId);
  if (pipelineIds.length === 0) return [];

  return db
    .select()
    .from(pipelines)
    .where(and(inArray(pipelines.id, pipelineIds), isNull(pipelines.deletedAt)));
}

/** Get user's organization details */
export async function getUserOrg(orgId: string | null) {
  if (!orgId) return null;
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  return org ?? null;
}

// ─── Cookie Helpers ─────────────────────────────────────────────────────────

export function setAuthCookies(response: NextResponse, token: string, username: string, role: string) {
  const cookieOptions = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };

  response.cookies.set("auth_token", token, { ...cookieOptions, httpOnly: true });
  response.cookies.set("auth_user", username, { ...cookieOptions, httpOnly: false });
  response.cookies.set("auth_role", role, { ...cookieOptions, httpOnly: false });
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of ["auth_token", "auth_user", "auth_role"]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}
