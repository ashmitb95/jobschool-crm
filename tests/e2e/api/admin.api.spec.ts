import { test, expect } from "../fixtures/api.fixture";

test.describe("Admin API", () => {
  // ── GET /api/admin/users ────────────────────────────────────────────────

  test.describe("GET /api/admin/users", () => {
    test("lists org users with pipeline assignments", async ({ api }) => {
      const res = await api.asAdmin().get("/api/admin/users");
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: unknown[] };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      const user = body.data[0] as Record<string, unknown>;
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("username");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("pipelines");
      expect(Array.isArray(user.pipelines)).toBe(true);
    });
  });

  // ── POST /api/admin/users ───────────────────────────────────────────────

  test.describe("POST /api/admin/users", () => {
    test("admin can create a user → 201", async ({ api }) => {
      const username = `testuser_${Date.now()}`;
      const res = await api.asAdmin().post("/api/admin/users", {
        username,
        password: "password123",
        displayName: "Test User",
        role: "member",
      });
      expect(res.status).toBe(201);

      const body = res.data as { success: boolean; data: { username: string } };
      expect(body.success).toBe(true);
      expect(body.data.username).toBe(username);
    });

    test("duplicate username returns error", async ({ api }) => {
      // First create a user
      const username = `dup_user_${Date.now()}`;
      await api.asAdmin().post("/api/admin/users", {
        username,
        password: "password123",
        displayName: "First",
        role: "member",
      });

      // Try to create the same username again
      const res = await api.asAdmin().post("/api/admin/users", {
        username,
        password: "password123",
        displayName: "Second",
        role: "member",
      });
      expect(res.status).toBe(409);
    });

    test("short password returns 400", async ({ api }) => {
      const res = await api.asAdmin().post("/api/admin/users", {
        username: `short_pass_${Date.now()}`,
        password: "12",
        displayName: "Short Pass",
        role: "member",
      });
      expect(res.status).toBe(400);
    });
  });

  // ── PATCH /api/admin/users/[id] ─────────────────────────────────────────

  test.describe("PATCH /api/admin/users/[id]", () => {
    test("admin can update a user role", async ({ api }) => {
      // Create a user to update
      const username = `role_update_${Date.now()}`;
      const createRes = await api.asAdmin().post("/api/admin/users", {
        username,
        password: "password123",
        displayName: "Role Update Target",
        role: "member",
      });
      const userId = (createRes.data as { success: boolean; data: { id: string } }).data.id;

      const res = await api.asAdmin().patch(`/api/admin/users/${userId}`, {
        role: "admin",
      });
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: { role: string } };
      expect(body.success).toBe(true);
      expect(body.data.role).toBe("admin");
    });
  });

  // ── DELETE /api/admin/users/[id] ────────────────────────────────────────

  test.describe("DELETE /api/admin/users/[id]", () => {
    test("soft deletes a user", async ({ api }) => {
      // Create a user to delete
      const username = `delete_target_${Date.now()}`;
      const createRes = await api.asAdmin().post("/api/admin/users", {
        username,
        password: "password123",
        displayName: "Delete Target",
        role: "member",
      });
      const userId = (createRes.data as { success: boolean; data: { id: string } }).data.id;

      const res = await api.asAdmin().delete(`/api/admin/users/${userId}`);
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: { message: string } };
      expect(body.data.message).toContain("deleted");
    });

    test("admin cannot delete themselves", async ({ api }) => {
      // Get list of users, find the admin
      const listRes = await api.asAdmin().get("/api/admin/users");
      const users = (listRes.data as { success: boolean; data: { id: string; username: string }[] }).data;
      const adminUser = users.find((u) => u.username === "admin");
      expect(adminUser).toBeTruthy();

      const res = await api.asAdmin().delete(`/api/admin/users/${adminUser!.id}`);
      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/admin/users/[id]/reset-password ───────────────────────────

  test.describe("POST /api/admin/users/[id]/reset-password", () => {
    test("admin can reset a user password", async ({ api }) => {
      // Create a user to reset password for
      const username = `reset_pass_${Date.now()}`;
      const createRes = await api.asAdmin().post("/api/admin/users", {
        username,
        password: "password123",
        displayName: "Reset Pass",
        role: "member",
      });
      const userId = (createRes.data as { success: boolean; data: { id: string } }).data.id;

      const res = await api.asAdmin().post(`/api/admin/users/${userId}/reset-password`, {
        newPassword: "newpassword456",
      });
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: { message: string } };
      expect(body.data.message).toContain("reset");
    });
  });

  // ── GET/PUT /api/admin/users/[id]/pipelines ─────────────────────────────

  test.describe("GET/PUT /api/admin/users/[id]/pipelines", () => {
    test("can get pipeline assignments for a user", async ({ api }) => {
      // Create a user
      const username = `pipe_access_${Date.now()}`;
      const createRes = await api.asAdmin().post("/api/admin/users", {
        username,
        password: "password123",
        displayName: "Pipeline Access User",
        role: "member",
      });
      const userId = (createRes.data as { success: boolean; data: { id: string } }).data.id;

      const res = await api.asAdmin().get(`/api/admin/users/${userId}/pipelines`);
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: unknown[] };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    test("can assign pipelines to a user", async ({ api }) => {
      const pipelineId = await api.getPipelineId();

      // Create a user
      const username = `pipe_assign_${Date.now()}`;
      const createRes = await api.asAdmin().post("/api/admin/users", {
        username,
        password: "password123",
        displayName: "Pipeline Assign User",
        role: "member",
      });
      const userId = (createRes.data as { success: boolean; data: { id: string } }).data.id;

      const res = await api.asAdmin().put(`/api/admin/users/${userId}/pipelines`, {
        pipelineIds: [pipelineId],
      });
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: { id: string }[] };
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(pipelineId);
    });

    test("after removing pipeline access, member cannot see leads in that pipeline", async ({ api }) => {
      const pipelineId = await api.getPipelineId();

      // Create a user and assign pipeline
      const username = `revoke_test_${Date.now()}`;
      const createRes = await api.asAdmin().post("/api/admin/users", {
        username,
        password: "password123",
        displayName: "Revoke Test",
        role: "member",
      });
      const userId = (createRes.data as { success: boolean; data: { id: string } }).data.id;

      // Assign pipeline
      await api.asAdmin().put(`/api/admin/users/${userId}/pipelines`, {
        pipelineIds: [pipelineId],
      });

      // Revoke pipeline access
      const revokeRes = await api.asAdmin().put(`/api/admin/users/${userId}/pipelines`, {
        pipelineIds: [],
      });
      expect(revokeRes.status).toBe(200);

      const body = revokeRes.data as { success: boolean; data: unknown[] };
      expect(body.data.length).toBe(0);
    });

    test("after adding pipeline, member can see pipeline data", async ({ api }) => {
      const pipelineId = await api.getPipelineId();

      // Create a user with no pipelines
      const username = `add_pipe_${Date.now()}`;
      const createRes = await api.asAdmin().post("/api/admin/users", {
        username,
        password: "password123",
        displayName: "Add Pipeline Test",
        role: "member",
      });
      const userId = (createRes.data as { success: boolean; data: { id: string } }).data.id;

      // Add pipeline
      const addRes = await api.asAdmin().put(`/api/admin/users/${userId}/pipelines`, {
        pipelineIds: [pipelineId],
      });
      expect(addRes.status).toBe(200);

      const body = addRes.data as { success: boolean; data: { id: string }[] };
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(pipelineId);
    });
  });
});
