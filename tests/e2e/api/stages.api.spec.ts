import { test, expect } from "../fixtures/api.fixture";
import { STAGE_NAMES } from "../fixtures/test-data";

test.describe("Stages API", () => {
  // ─── List ──────────────────────────────────────────────────────────────────

  test.describe("List", () => {
    test("GET /api/stages?pipelineId=xxx returns array with leadCount", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().get(`/api/stages?pipelineId=${pipelineId}`);

      expect(res.status).toBe(200);
      const stages = res.data as Array<{ id: string; name: string; order: number; leadCount: number }>;
      expect(Array.isArray(stages)).toBe(true);
      expect(stages.length).toBe(STAGE_NAMES.length);
      for (const stage of stages) {
        expect(stage.id).toBeDefined();
        expect(stage.name).toBeDefined();
        expect(typeof stage.leadCount).toBe("number");
      }
    });

    test("GET /api/stages without pipelineId returns 400", async ({ api }) => {
      const res = await api.asAdmin().get("/api/stages");

      expect(res.status).toBe(400);
    });

    test("GET /api/stages with invalid pipelineId returns 403", async ({ api }) => {
      const res = await api.asAdmin().get("/api/stages?pipelineId=nonexistent-pipeline-id");

      expect(res.status).toBe(403);
    });

    test("GET /api/stages returns stages in order", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().get(`/api/stages?pipelineId=${pipelineId}`);

      expect(res.status).toBe(200);
      const stages = res.data as Array<{ order: number; name: string }>;
      for (let i = 1; i < stages.length; i++) {
        expect(stages[i].order).toBeGreaterThanOrEqual(stages[i - 1].order);
      }
    });
  });

  // ─── Create ────────────────────────────────────────────────────────────────

  test.describe("Create", () => {
    test("POST /api/stages with name and pipelineId returns 201", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const stageName = `Test Stage ${Date.now()}`;
      const res = await api.asAdmin().post("/api/stages", {
        name: stageName,
        pipelineId,
      });

      expect(res.status).toBe(201);
      const stage = res.data as { id: string; name: string; pipelineId: string };
      expect(stage.id).toBeDefined();
      expect(stage.name).toBe(stageName);
      expect(stage.pipelineId).toBe(pipelineId);

      // Cleanup: delete the stage we just created
      await api.asAdmin().delete(`/api/stages/${stage.id}`);
    });

    test("POST /api/stages auto-creates Notes field", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().post("/api/stages", {
        name: `AutoNotes Stage ${Date.now()}`,
        pipelineId,
      });

      expect(res.status).toBe(201);
      const stage = res.data as { id: string };

      // Verify the auto-created Notes field exists
      const fieldsRes = await api.asAdmin().get(`/api/stages/${stage.id}/fields`);
      expect(fieldsRes.status).toBe(200);
      const fields = fieldsRes.data as Array<{ name: string; fieldKey: string; fieldType: string }>;
      const notesField = fields.find((f) => f.fieldKey === "notes");
      expect(notesField).toBeDefined();
      expect(notesField!.name).toBe("Notes");
      expect(notesField!.fieldType).toBe("textarea");

      // Cleanup
      await api.asAdmin().delete(`/api/stages/${stage.id}`);
    });

    test("POST /api/stages without name returns 400", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().post("/api/stages", {
        pipelineId,
      });

      expect(res.status).toBe(400);
    });
  });

  // ─── Update ────────────────────────────────────────────────────────────────

  test.describe("Update", () => {
    test("PUT /api/stages bulk update order returns 200", async ({ api }) => {
      const pipelineId = await api.getPipelineId();

      // Get current stages
      const listRes = await api.asAdmin().get(`/api/stages?pipelineId=${pipelineId}`);
      const stages = listRes.data as Array<{ id: string; order: number; name: string }>;

      // Build a bulk update that re-assigns the same order (safe, no reorder side effects)
      const stageUpdates = stages.map((s) => ({
        id: s.id,
        order: s.order,
      }));

      const res = await api.asAdmin().put("/api/stages", { stages: stageUpdates });

      expect(res.status).toBe(200);
      const body = res.data as { success: boolean };
      expect(body.success).toBe(true);
    });

    test("PATCH /api/stages/[id] name returns 200", async ({ api }) => {
      const pipelineId = await api.getPipelineId();

      // Create a temporary stage to update
      const createRes = await api.asAdmin().post("/api/stages", {
        name: `PatchTest Stage ${Date.now()}`,
        pipelineId,
      });
      const stage = createRes.data as { id: string };

      const newName = `Renamed Stage ${Date.now()}`;
      const res = await api.asAdmin().patch(`/api/stages/${stage.id}`, { name: newName });

      expect(res.status).toBe(200);
      const body = res.data as { success: boolean };
      expect(body.success).toBe(true);

      // Verify the name was updated via GET
      const getRes = await api.asAdmin().get(`/api/stages/${stage.id}`);
      const updated = getRes.data as { name: string };
      expect(updated.name).toBe(newName);

      // Cleanup
      await api.asAdmin().delete(`/api/stages/${stage.id}`);
    });
  });

  // ─── Delete ────────────────────────────────────────────────────────────────

  test.describe("Delete", () => {
    test("DELETE /api/stages/[id] with leads returns 409", async ({ api }) => {
      // Try deleting a seed stage that has leads assigned
      const stageId = await api.getStageId("New Lead");
      const res = await api.asAdmin().delete(`/api/stages/${stageId}`);

      expect(res.status).toBe(409);
      const body = res.data as { error: string };
      expect(body.error).toContain("Cannot delete");
    });

    test("DELETE /api/stages/[id] returns 200", async ({ api }) => {
      const pipelineId = await api.getPipelineId();

      // Create a stage to delete
      const createRes = await api.asAdmin().post("/api/stages", {
        name: `DeleteTest Stage ${Date.now()}`,
        pipelineId,
      });
      const stage = createRes.data as { id: string };

      const res = await api.asAdmin().delete(`/api/stages/${stage.id}`);

      expect(res.status).toBe(200);
      const body = res.data as { success: boolean };
      expect(body.success).toBe(true);

      // Verify the stage no longer exists
      const getRes = await api.asAdmin().get(`/api/stages/${stage.id}`);
      expect(getRes.status).toBe(404);
    });
  });

  // ─── Fields ────────────────────────────────────────────────────────────────

  test.describe("Fields", () => {
    test("GET /api/stages/[id]/fields returns array", async ({ api }) => {
      const stageId = await api.getStageId("New Lead");
      const res = await api.asAdmin().get(`/api/stages/${stageId}/fields`);

      expect(res.status).toBe(200);
      const fields = res.data as Array<{ id: string; name: string; fieldKey: string; fieldType: string }>;
      expect(Array.isArray(fields)).toBe(true);
    });

    test("GET /api/stages/[id]/fields for seed stage returns expected fields", async ({ api }) => {
      // The "Contacted" stage should have at least the contact_method field from seed data
      const stageId = await api.getStageId("Contacted");
      const res = await api.asAdmin().get(`/api/stages/${stageId}/fields`);

      expect(res.status).toBe(200);
      const fields = res.data as Array<{ fieldKey: string; required: boolean }>;
      expect(fields.length).toBeGreaterThan(0);
      const contactMethod = fields.find((f) => f.fieldKey === "contact_method");
      expect(contactMethod).toBeDefined();
      expect(contactMethod!.required).toBe(true);
    });

    test("POST /api/stages/[id]/fields creates field and verifiable via GET", async ({ api }) => {
      const pipelineId = await api.getPipelineId();

      // Create a temp stage so we don't pollute seed data
      const stageRes = await api.asAdmin().post("/api/stages", {
        name: `FieldTest Stage ${Date.now()}`,
        pipelineId,
      });
      const stage = stageRes.data as { id: string };

      // Create a new field
      const fieldRes = await api.asAdmin().post(`/api/stages/${stage.id}/fields`, {
        name: "Test Field",
        fieldType: "text",
        required: true,
      });

      expect(fieldRes.status).toBe(201);
      const field = fieldRes.data as { id: string; name: string; fieldKey: string; fieldType: string };
      expect(field.name).toBe("Test Field");
      expect(field.fieldKey).toBe("test_field");
      expect(field.fieldType).toBe("text");

      // Verify via GET
      const getRes = await api.asAdmin().get(`/api/stages/${stage.id}/fields`);
      const fields = getRes.data as Array<{ name: string; fieldKey: string }>;
      const found = fields.find((f) => f.fieldKey === "test_field");
      expect(found).toBeDefined();

      // Cleanup
      await api.asAdmin().delete(`/api/stages/${stage.id}`);
    });
  });

  // ─── Transitions ───────────────────────────────────────────────────────────

  test.describe("Transitions", () => {
    test("GET /api/stages/transitions without pipelineId returns 400", async ({ api }) => {
      const res = await api.asAdmin().get("/api/stages/transitions");

      expect(res.status).toBe(400);
    });

    test("GET /api/stages/transitions?pipelineId=xxx returns array", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().get(`/api/stages/transitions?pipelineId=${pipelineId}`);

      expect(res.status).toBe(200);
      const transitions = res.data as Array<{ id: string; fromStageId: string; toStageId: string }>;
      expect(Array.isArray(transitions)).toBe(true);
      expect(transitions.length).toBeGreaterThan(0);
      for (const t of transitions) {
        expect(t.fromStageId).toBeDefined();
        expect(t.toStageId).toBeDefined();
      }
    });

    test("PUT /api/stages/transitions replaces transitions and verifiable via GET", async ({ api }) => {
      const pipelineId = await api.getPipelineId();

      // Read current transitions
      const beforeRes = await api.asAdmin().get(`/api/stages/transitions?pipelineId=${pipelineId}`);
      const originalTransitions = beforeRes.data as Array<{ fromStageId: string; toStageId: string }>;

      // Build the same transitions to PUT (so we don't break state for other tests)
      const transitionsPayload = originalTransitions.map((t) => ({
        fromStageId: t.fromStageId,
        toStageId: t.toStageId,
      }));

      const res = await api.asAdmin().put("/api/stages/transitions", {
        transitions: transitionsPayload,
        pipelineId,
      });

      expect(res.status).toBe(200);
      const body = res.data as { success: boolean; count: number };
      expect(body.success).toBe(true);
      expect(body.count).toBe(transitionsPayload.length);

      // Verify via GET
      const afterRes = await api.asAdmin().get(`/api/stages/transitions?pipelineId=${pipelineId}`);
      const afterTransitions = afterRes.data as Array<{ fromStageId: string; toStageId: string }>;
      expect(afterTransitions.length).toBe(originalTransitions.length);
    });
  });

  // ─── Stage Data ────────────────────────────────────────────────────────────

  test.describe("Stage Data", () => {
    test("GET /api/leads/[id]/stage-data returns grouped by stage", async ({ api }) => {
      // Create a lead and move it through stages with field data so there is stage data to fetch
      const lead = await api.createTestLead();
      const contactedStageId = await api.getStageId("Contacted");

      // Move to "Contacted" with required fields
      await api.asAdmin().patch(`/api/leads/${lead.id}/stage`, {
        stageId: contactedStageId,
        fieldValues: { contact_method: "WhatsApp" },
      });

      const res = await api.asAdmin().get(`/api/leads/${lead.id}/stage-data`);

      expect(res.status).toBe(200);
      const body = res.data as Array<{
        stageName: string;
        stageColor: string;
        stageId: string;
        fields: Array<{ fieldName: string; fieldKey: string; fieldType: string; value: string | null }>;
      }>;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);

      // Each group should have stage metadata and fields array
      for (const group of body) {
        expect(group.stageName).toBeDefined();
        expect(group.stageId).toBeDefined();
        expect(group.stageColor).toBeDefined();
        expect(Array.isArray(group.fields)).toBe(true);
        for (const field of group.fields) {
          expect(field.fieldName).toBeDefined();
          expect(field.fieldKey).toBeDefined();
          expect(field.fieldType).toBeDefined();
        }
      }
    });
  });
});
