import { test, expect } from "../fixtures/api.fixture";
import { USERS } from "../fixtures/test-data";

test.describe("RBAC API", () => {
  // ─── Tenant endpoints reject super_admin ────────────────────────────────────

  test.describe("Tenant endpoints reject super_admin", () => {
    test("GET /api/leads as super_admin returns 403", async ({ api }) => {
      const res = await api.asSuperAdmin().get("/api/leads");
      expect(res.status).toBe(403);
    });

    test("POST /api/leads as super_admin returns 403", async ({ api }) => {
      const res = await api.asSuperAdmin().post("/api/leads", {
        name: "Test",
        phone: "+919999999999",
      });
      expect(res.status).toBe(403);
    });

    test("GET /api/stages as super_admin returns 403", async ({ api }) => {
      const res = await api.asSuperAdmin().get("/api/stages");
      expect(res.status).toBe(403);
    });

    test("GET /api/pipelines as super_admin returns 403", async ({ api }) => {
      const res = await api.asSuperAdmin().get("/api/pipelines");
      expect(res.status).toBe(403);
    });

    test("GET /api/templates as super_admin returns 403", async ({ api }) => {
      const res = await api.asSuperAdmin().get("/api/templates");
      expect(res.status).toBe(403);
    });
  });

  // ─── Admin endpoints reject member ──────────────────────────────────────────

  test.describe("Admin endpoints reject member", () => {
    test("GET /api/admin/users as member returns 403", async ({ api }) => {
      const res = await api.asMember().get("/api/admin/users");
      expect(res.status).toBe(403);
    });

    test("POST /api/admin/users as member returns 403", async ({ api }) => {
      const res = await api.asMember().post("/api/admin/users", {
        username: "newuser",
        password: "password123",
        displayName: "New User",
        role: "member",
      });
      expect(res.status).toBe(403);
    });

    test("GET /api/admin/users/:id/pipelines as member returns 403", async ({
      api,
    }) => {
      // Use a placeholder user ID — the auth guard runs before param validation
      const res = await api
        .asMember()
        .get("/api/admin/users/fake-user-id/pipelines");
      expect(res.status).toBe(403);
    });

    test("PUT /api/admin/users/:id/pipelines as member returns 403", async ({
      api,
    }) => {
      const res = await api
        .asMember()
        .put("/api/admin/users/fake-user-id/pipelines", {
          pipelineIds: [],
        });
      expect(res.status).toBe(403);
    });
  });

  // ─── Manage endpoints reject admin and member ───────────────────────────────

  test.describe("Manage endpoints reject admin and member", () => {
    test("GET /api/manage/orgs as admin returns 403", async ({ api }) => {
      const res = await api.asAdmin().get("/api/manage/orgs");
      expect(res.status).toBe(403);
    });

    test("GET /api/manage/orgs as member returns 403", async ({ api }) => {
      const res = await api.asMember().get("/api/manage/orgs");
      expect(res.status).toBe(403);
    });

    test("POST /api/manage/orgs as admin returns 403", async ({ api }) => {
      const res = await api.asAdmin().post("/api/manage/orgs", {
        name: "Rogue Org",
        slug: "rogue-org",
      });
      expect(res.status).toBe(403);
    });

    test("POST /api/manage/orgs as member returns 403", async ({ api }) => {
      const res = await api.asMember().post("/api/manage/orgs", {
        name: "Rogue Org",
        slug: "rogue-org",
      });
      expect(res.status).toBe(403);
    });
  });

  // ─── Unauthenticated requests ───────────────────────────────────────────────

  test.describe("Unauthenticated requests", () => {
    test("GET /api/leads without auth returns 401", async ({ api }) => {
      const res = await api.unauthenticated().get("/api/leads");
      expect(res.status).toBe(401);
    });

    test("GET /api/stages without auth returns 401", async ({ api }) => {
      const res = await api.unauthenticated().get("/api/stages");
      expect(res.status).toBe(401);
    });

    test("GET /api/pipelines without auth returns 401", async ({ api }) => {
      const res = await api.unauthenticated().get("/api/pipelines");
      expect(res.status).toBe(401);
    });

    test("GET /api/templates without auth returns 401", async ({ api }) => {
      const res = await api.unauthenticated().get("/api/templates");
      expect(res.status).toBe(401);
    });

    test("GET /api/admin/users without auth returns 401", async ({ api }) => {
      const res = await api.unauthenticated().get("/api/admin/users");
      expect(res.status).toBe(401);
    });

    test("GET /api/manage/orgs without auth returns 401", async ({ api }) => {
      const res = await api.unauthenticated().get("/api/manage/orgs");
      expect(res.status).toBe(401);
    });

    test("POST /api/leads without auth returns 401", async ({ api }) => {
      const res = await api.unauthenticated().post("/api/leads", {
        name: "Test",
        phone: "+919999999999",
      });
      expect(res.status).toBe(401);
    });

    test("GET /api/auth/me without auth returns 401", async ({ api }) => {
      const res = await api.unauthenticated().get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    test("POST /api/auth/change-password without auth returns 401", async ({
      api,
    }) => {
      const res = await api
        .unauthenticated()
        .post("/api/auth/change-password", {
          currentPassword: "old",
          newPassword: "newpassword",
        });
      expect(res.status).toBe(401);
    });
  });

  // ─── Admin endpoints reject super_admin ─────────────────────────────────────

  test.describe("Admin endpoints reject super_admin", () => {
    test("GET /api/admin/users as super_admin returns 403", async ({
      api,
    }) => {
      const res = await api.asSuperAdmin().get("/api/admin/users");
      expect(res.status).toBe(403);
    });

    test("PUT /api/admin/users/:id/pipelines as super_admin returns 403", async ({
      api,
    }) => {
      const res = await api
        .asSuperAdmin()
        .put("/api/admin/users/fake-user-id/pipelines", {
          pipelineIds: [],
        });
      expect(res.status).toBe(403);
    });
  });

  // ─── Pipeline scoping ──────────────────────────────────────────────────────

  test.describe.serial("Pipeline scoping", () => {
    let pipelineId: string;
    let memberId: string;

    test("setup: retrieve pipeline ID and member user ID", async ({ api }) => {
      // Get the pipeline ID from admin
      pipelineId = await api.getPipelineId();
      expect(pipelineId).toBeTruthy();

      // Get the member's user ID from the admin users list
      const usersRes = await api.asAdmin().get("/api/admin/users");
      expect(usersRes.status).toBe(200);
      const usersBody = usersRes.data as {
        success: boolean;
        data: { id: string; username: string; role: string }[];
      };
      const memberUser = usersBody.data.find(
        (u) => u.username === USERS.member.username
      );
      expect(memberUser).toBeTruthy();
      memberId = memberUser!.id;
    });

    test("member with pipeline access can see leads", async ({ api }) => {
      const res = await api.asMember().get("/api/leads");
      expect(res.status).toBe(200);
      const body = res.data as { leads: unknown[] };
      // Member should have access to leads (seeded data)
      expect(body.leads).toBeDefined();
      expect(Array.isArray(body.leads)).toBe(true);
    });

    test("admin removes member pipeline access", async ({ api }) => {
      const res = await api
        .asAdmin()
        .put(`/api/admin/users/${memberId}/pipelines`, {
          pipelineIds: [],
        });
      expect(res.status).toBe(200);
      const body = res.data as { success: boolean; data: unknown[] };
      expect(body.success).toBe(true);
      // Should return empty array since we removed all access
      expect(body.data).toHaveLength(0);
    });

    test("member with no pipeline access sees empty leads", async ({
      api,
    }) => {
      const res = await api.asMember().get("/api/leads");
      expect(res.status).toBe(200);
      const body = res.data as {
        leads: unknown[];
        pagination: { total: number };
      };
      expect(body.leads).toHaveLength(0);
      expect(body.pagination.total).toBe(0);
    });

    test("member with no pipeline access sees empty pipelines", async ({
      api,
    }) => {
      const res = await api.asMember().get("/api/pipelines");
      expect(res.status).toBe(200);
      const body = res.data as { success: boolean; data: unknown[] };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(0);
    });

    test("admin restores member pipeline access", async ({ api }) => {
      const res = await api
        .asAdmin()
        .put(`/api/admin/users/${memberId}/pipelines`, {
          pipelineIds: [pipelineId],
        });
      expect(res.status).toBe(200);
      const body = res.data as { success: boolean; data: { id: string }[] };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(pipelineId);
    });

    test("member with restored access can see leads again", async ({
      api,
    }) => {
      const res = await api.asMember().get("/api/leads");
      expect(res.status).toBe(200);
      const body = res.data as {
        leads: unknown[];
        pagination: { total: number };
      };
      expect(body.leads).toBeDefined();
      expect(body.leads.length).toBeGreaterThan(0);
    });
  });
});
