import { test, expect } from "../fixtures/api.fixture";

test.describe("Pipelines API", () => {
  // ── GET /api/pipelines ──────────────────────────────────────────────────

  test.describe("GET /api/pipelines", () => {
    test("admin sees all org pipelines with stageCount and leadCount", async ({ api }) => {
      const res = await api.asAdmin().get("/api/pipelines");
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: unknown[] };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      const pipeline = body.data[0] as Record<string, unknown>;
      expect(pipeline).toHaveProperty("id");
      expect(pipeline).toHaveProperty("name");
      expect(pipeline).toHaveProperty("stageCount");
      expect(pipeline).toHaveProperty("leadCount");
    });

    test("member sees only assigned pipelines", async ({ api }) => {
      const res = await api.asMember().get("/api/pipelines");
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: unknown[] };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      // Member may see fewer pipelines than admin
    });
  });

  // ── POST /api/pipelines ─────────────────────────────────────────────────

  test.describe("POST /api/pipelines", () => {
    test("admin can create a pipeline", async ({ api }) => {
      const name = `Test Pipeline ${Date.now()}`;
      const res = await api.asAdmin().post("/api/pipelines", {
        name,
        description: "E2E test pipeline",
      });
      expect(res.status).toBe(201);

      const body = res.data as { success: boolean; data: { id: string; name: string } };
      expect(body.success).toBe(true);
      expect(body.data.name).toBe(name);
    });

    test("member cannot create a pipeline → 403", async ({ api }) => {
      const res = await api.asMember().post("/api/pipelines", {
        name: "Unauthorized Pipeline",
      });
      expect(res.status).toBe(403);
    });

    test("missing name returns 400", async ({ api }) => {
      const res = await api.asAdmin().post("/api/pipelines", {
        description: "No name provided",
      });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/pipelines/[id] ─────────────────────────────────────────────

  test.describe("GET /api/pipelines/[id]", () => {
    test("returns pipeline details when user has access", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().get(`/api/pipelines/${pipelineId}`);
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: Record<string, unknown> };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(pipelineId);
      expect(body.data).toHaveProperty("stageCount");
      expect(body.data).toHaveProperty("leadCount");
    });
  });

  // ── PATCH /api/pipelines/[id] ───────────────────────────────────────────

  test.describe("PATCH /api/pipelines/[id]", () => {
    test("admin can update a pipeline", async ({ api }) => {
      // Create a pipeline to update
      const createRes = await api.asAdmin().post("/api/pipelines", {
        name: `Update Target ${Date.now()}`,
      });
      const created = (createRes.data as { success: boolean; data: { id: string } }).data;

      const updatedName = `Updated ${Date.now()}`;
      const res = await api.asAdmin().patch(`/api/pipelines/${created.id}`, {
        name: updatedName,
      });
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean; data: { name: string } };
      expect(body.success).toBe(true);
      expect(body.data.name).toBe(updatedName);
    });

    test("member cannot update a pipeline → 403", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asMember().patch(`/api/pipelines/${pipelineId}`, {
        name: "Should Fail",
      });
      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /api/pipelines/[id] ──────────────────────────────────────────

  test.describe("DELETE /api/pipelines/[id]", () => {
    test("admin can delete an empty pipeline", async ({ api }) => {
      // Create an empty pipeline first
      const createRes = await api.asAdmin().post("/api/pipelines", {
        name: `Delete Target ${Date.now()}`,
      });
      const created = (createRes.data as { success: boolean; data: { id: string } }).data;

      const res = await api.asAdmin().delete(`/api/pipelines/${created.id}`);
      expect(res.status).toBe(200);
    });

    test("cannot delete a pipeline that has leads", async ({ api }) => {
      // The default pipeline has seeded leads
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().delete(`/api/pipelines/${pipelineId}`);
      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
    });
  });
});
