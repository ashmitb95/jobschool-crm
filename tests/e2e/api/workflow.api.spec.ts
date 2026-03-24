import { test, expect } from "../fixtures/api.fixture";

test.describe("Workflow API", () => {
  // ── GET /api/workflow ───────────────────────────────────────────────────

  test.describe("GET /api/workflow", () => {
    test("returns stages and transitions for a pipeline", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().get(`/api/workflow?pipelineId=${pipelineId}`);
      expect(res.status).toBe(200);

      const body = res.data as { stages: unknown[]; transitions: unknown[] };
      expect(body).toHaveProperty("stages");
      expect(body).toHaveProperty("transitions");
      expect(Array.isArray(body.stages)).toBe(true);
      expect(Array.isArray(body.transitions)).toBe(true);
      expect(body.stages.length).toBeGreaterThan(0);
    });

    test("missing pipelineId returns 400", async ({ api }) => {
      const res = await api.asAdmin().get("/api/workflow");
      expect(res.status).toBe(400);
    });
  });

  // ── PUT /api/workflow ───────────────────────────────────────────────────

  test.describe("PUT /api/workflow", () => {
    test("can update stage positions", async ({ api }) => {
      const pipelineId = await api.getPipelineId();

      // Get current stages
      const getRes = await api.asAdmin().get(`/api/workflow?pipelineId=${pipelineId}`);
      const { stages } = getRes.data as { stages: { id: string }[] };
      expect(stages.length).toBeGreaterThan(0);

      // Update positions
      const positions = stages.map((s, i) => ({
        id: s.id,
        x: i * 250,
        y: 100,
      }));

      const res = await api.asAdmin().put("/api/workflow", {
        pipelineId,
        positions,
      });
      expect(res.status).toBe(200);

      const body = res.data as { success: boolean };
      expect(body.success).toBe(true);
    });
  });
});
