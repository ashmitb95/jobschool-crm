import { test, expect } from "../fixtures/api.fixture";

test.describe("Manage (Super Admin) API", () => {
  // ── GET /api/manage/orgs ────────────────────────────────────────────────

  test.describe("GET /api/manage/orgs", () => {
    test("super admin can list orgs", async ({ api }) => {
      const res = await api.asSuperAdmin().get("/api/manage/orgs");
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: unknown[] };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      const org = body.data[0] as Record<string, unknown>;
      expect(org).toHaveProperty("id");
      expect(org).toHaveProperty("name");
      expect(org).toHaveProperty("slug");
      expect(org).toHaveProperty("userCount");
      expect(org).toHaveProperty("pipelineCount");
    });
  });

  // ── POST /api/manage/orgs ───────────────────────────────────────────────

  test.describe("POST /api/manage/orgs", () => {
    test("super admin can create an org → 201", async ({ api }) => {
      const slug = `test-org-${Date.now()}`;
      const res = await api.asSuperAdmin().post("/api/manage/orgs", {
        name: "Test Organization",
        slug,
      });
      expect(res.status).toBe(201);

      const body = res.data as { success: boolean; data: { slug: string } };
      expect(body.success).toBe(true);
      expect(body.data.slug).toBe(slug);
    });

    test("duplicate slug returns error", async ({ api }) => {
      const slug = `dup-org-${Date.now()}`;
      // Create first
      await api.asSuperAdmin().post("/api/manage/orgs", {
        name: "Dup Org 1",
        slug,
      });

      // Duplicate
      const res = await api.asSuperAdmin().post("/api/manage/orgs", {
        name: "Dup Org 2",
        slug,
      });
      expect(res.status).toBe(409);
    });
  });

  // ── GET /api/manage/orgs/[id] ───────────────────────────────────────────

  test.describe("GET /api/manage/orgs/[id]", () => {
    test("returns org details with users", async ({ api }) => {
      // Get list of orgs first
      const listRes = await api.asSuperAdmin().get("/api/manage/orgs");
      const orgs = (listRes.data as { success: boolean; data: { id: string }[] }).data;
      expect(orgs.length).toBeGreaterThan(0);

      const orgId = orgs[0].id;
      const res = await api.asSuperAdmin().get(`/api/manage/orgs/${orgId}`);
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: Record<string, unknown> };
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("users");
      expect(body.data).toHaveProperty("pipelines");
      expect(Array.isArray(body.data.users)).toBe(true);
    });
  });

  // ── PATCH /api/manage/orgs/[id] ─────────────────────────────────────────

  test.describe("PATCH /api/manage/orgs/[id]", () => {
    test("super admin can update an org", async ({ api }) => {
      // Create an org to update
      const slug = `patch-org-${Date.now()}`;
      const createRes = await api.asSuperAdmin().post("/api/manage/orgs", {
        name: "Patch Target",
        slug,
      });
      const orgId = (createRes.data as { success: boolean; data: { id: string } }).data.id;

      const updatedName = `Updated Org ${Date.now()}`;
      const res = await api.asSuperAdmin().patch(`/api/manage/orgs/${orgId}`, {
        name: updatedName,
      });
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: { name: string } };
      expect(body.success).toBe(true);
      expect(body.data.name).toBe(updatedName);
    });
  });

  // ── DELETE /api/manage/orgs/[id] ────────────────────────────────────────

  test.describe("DELETE /api/manage/orgs/[id]", () => {
    test("can delete an empty org", async ({ api }) => {
      // Create an org with no users
      const slug = `empty-org-${Date.now()}`;
      const createRes = await api.asSuperAdmin().post("/api/manage/orgs", {
        name: "Empty Org",
        slug,
      });
      const orgId = (createRes.data as { success: boolean; data: { id: string } }).data.id;

      const res = await api.asSuperAdmin().delete(`/api/manage/orgs/${orgId}`);
      expect(res.status).toBe(200);
    });

    test("cannot delete an org with users → error", async ({ api }) => {
      // The seed org (jobschool) has users
      const listRes = await api.asSuperAdmin().get("/api/manage/orgs");
      const orgs = (listRes.data as { success: boolean; data: { id: string; userCount: number }[] }).data;
      const nonEmptyOrg = orgs.find((o) => o.userCount > 0);
      expect(nonEmptyOrg).toBeTruthy();

      const res = await api.asSuperAdmin().delete(`/api/manage/orgs/${nonEmptyOrg!.id}`);
      expect(res.status).toBe(409);
    });
  });

  // ── GET/POST /api/manage/orgs/[id]/users ────────────────────────────────

  test.describe("GET/POST /api/manage/orgs/[id]/users", () => {
    test("can list users in an org", async ({ api }) => {
      const listRes = await api.asSuperAdmin().get("/api/manage/orgs");
      const orgs = (listRes.data as { success: boolean; data: { id: string }[] }).data;
      const orgId = orgs[0].id;

      const res = await api.asSuperAdmin().get(`/api/manage/orgs/${orgId}/users`);
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: unknown[] };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    test("can create a user in an org", async ({ api }) => {
      // Create an org first
      const slug = `user-org-${Date.now()}`;
      const createOrgRes = await api.asSuperAdmin().post("/api/manage/orgs", {
        name: "User Org",
        slug,
      });
      const orgId = (createOrgRes.data as { success: boolean; data: { id: string } }).data.id;

      const username = `org_admin_${Date.now()}`;
      const res = await api.asSuperAdmin().post(`/api/manage/orgs/${orgId}/users`, {
        username,
        password: "password123",
        displayName: "Org Admin",
        role: "admin",
      });
      expect(res.status).toBe(201);

      const body = res.data as { success: boolean; data: { username: string; role: string } };
      expect(body.success).toBe(true);
      expect(body.data.username).toBe(username);
      expect(body.data.role).toBe("admin");
    });
  });

  // ── RBAC: non-super_admin rejected ──────────────────────────────────────

  test.describe("RBAC enforcement", () => {
    test("admin cannot access manage orgs → 403", async ({ api }) => {
      const res = await api.asAdmin().get("/api/manage/orgs");
      expect(res.status).toBe(403);
    });

    test("member cannot access manage orgs → 403", async ({ api }) => {
      const res = await api.asMember().get("/api/manage/orgs");
      expect(res.status).toBe(403);
    });
  });
});
