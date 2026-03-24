import { test, expect } from "../fixtures/api.fixture";
import {
  REQUIRED_STAGE_FIELDS,
} from "../fixtures/test-data";

test.describe("Leads API", () => {
  // ─── Create ────────────────────────────────────────────────────────────────

  test.describe("Create", () => {
    test("POST /api/leads with valid data returns 201", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().post("/api/leads", {
        name: `Valid Lead ${Date.now()}`,
        phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        pipelineId,
      });

      expect(res.status).toBe(201);
      const lead = res.data as { id: string; name: string; phone: string; pipelineId: string };
      expect(lead.id).toBeDefined();
      expect(lead.name).toContain("Valid Lead");
      expect(lead.pipelineId).toBe(pipelineId);
    });

    test("POST /api/leads without name returns 400", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().post("/api/leads", {
        phone: "+919999900000",
        pipelineId,
      });

      expect(res.status).toBe(400);
    });

    test("POST /api/leads without phone returns 400", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().post("/api/leads", {
        name: "No Phone Lead",
        pipelineId,
      });

      expect(res.status).toBe(400);
    });

    test("POST /api/leads without pipelineId returns 400", async ({ api }) => {
      const res = await api.asAdmin().post("/api/leads", {
        name: "No Pipeline Lead",
        phone: "+919999900001",
      });

      expect(res.status).toBe(400);
    });

    test("POST /api/leads with invalid pipelineId returns 403", async ({ api }) => {
      const res = await api.asAdmin().post("/api/leads", {
        name: "Bad Pipeline Lead",
        phone: "+919999900002",
        pipelineId: "nonexistent-pipeline-id",
      });

      expect(res.status).toBe(403);
    });

    test("POST /api/leads auto-assigns to default/first stage", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().post("/api/leads", {
        name: `AutoStage Lead ${Date.now()}`,
        phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        pipelineId,
      });

      expect(res.status).toBe(201);
      const lead = res.data as { stageId: string; stageName: string };
      expect(lead.stageId).toBeDefined();
      // The lead should be assigned to a stage (default or first)
      expect(lead.stageName).toBeTruthy();
    });
  });

  // ─── Read ──────────────────────────────────────────────────────────────────

  test.describe("Read", () => {
    test("GET /api/leads?pipelineId=xxx returns leads and pagination", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().get(`/api/leads?pipelineId=${pipelineId}`);

      expect(res.status).toBe(200);
      const body = res.data as {
        leads: unknown[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
      expect(Array.isArray(body.leads)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(20);
      expect(typeof body.pagination.total).toBe("number");
      expect(typeof body.pagination.totalPages).toBe("number");
    });

    test("GET /api/leads?search=Arjun filters by name", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().get(`/api/leads?pipelineId=${pipelineId}&search=Arjun`);

      expect(res.status).toBe(200);
      const body = res.data as { leads: { name: string }[] };
      expect(body.leads.length).toBeGreaterThan(0);
      for (const lead of body.leads) {
        expect(lead.name.toLowerCase()).toContain("arjun");
      }
    });

    test("GET /api/leads?source=meta_ads filters by source", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      // First create a lead with meta_ads source to ensure at least one exists
      await api.asAdmin().post("/api/leads", {
        name: `Meta Lead ${Date.now()}`,
        phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        pipelineId,
        source: "meta_ads",
      });

      const res = await api.asAdmin().get(`/api/leads?pipelineId=${pipelineId}&source=meta_ads`);

      expect(res.status).toBe(200);
      const body = res.data as { leads: { source: string }[] };
      expect(body.leads.length).toBeGreaterThan(0);
      for (const lead of body.leads) {
        expect(lead.source).toBe("meta_ads");
      }
    });

    test("GET /api/leads?stageId=xxx filters by stage", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const stageId = await api.getStageId("New Lead");
      const res = await api.asAdmin().get(`/api/leads?pipelineId=${pipelineId}&stageId=${stageId}`);

      expect(res.status).toBe(200);
      const body = res.data as { leads: { stageId: string }[] };
      for (const lead of body.leads) {
        expect(lead.stageId).toBe(stageId);
      }
    });

    test("GET /api/leads?sortBy=oldest sorts ascending", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().get(`/api/leads?pipelineId=${pipelineId}&sortBy=oldest`);

      expect(res.status).toBe(200);
      const body = res.data as { leads: { createdAt: string }[] };
      if (body.leads.length >= 2) {
        for (let i = 1; i < body.leads.length; i++) {
          expect(body.leads[i].createdAt >= body.leads[i - 1].createdAt).toBe(true);
        }
      }
    });

    test("GET /api/leads?page=2&limit=5 paginates correctly", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const res = await api.asAdmin().get(`/api/leads?pipelineId=${pipelineId}&page=2&limit=5`);

      expect(res.status).toBe(200);
      const body = res.data as {
        leads: unknown[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(5);
      expect(body.leads.length).toBeLessThanOrEqual(5);
    });

    test("GET /api/leads excludes soft-deleted leads", async ({ api }) => {
      const pipelineId = await api.getPipelineId();

      // Create and then soft-delete a lead
      const created = await api.createTestLead();
      await api.asAdmin().delete(`/api/leads/${created.id}`);

      // Fetch all leads and ensure the deleted one is not present
      const res = await api.asAdmin().get(`/api/leads?pipelineId=${pipelineId}&limit=100`);
      expect(res.status).toBe(200);
      const body = res.data as { leads: { id: string }[] };
      const found = body.leads.find((l) => l.id === created.id);
      expect(found).toBeUndefined();
    });

    test("GET /api/leads/[id] returns lead with messages array", async ({ api }) => {
      const lead = await api.createTestLead();
      const res = await api.asAdmin().get(`/api/leads/${lead.id}`);

      expect(res.status).toBe(200);
      const body = res.data as {
        id: string;
        name: string;
        stage: { id: string; name: string };
        messages: unknown[];
      };
      expect(body.id).toBe(lead.id);
      expect(body.stage).toBeDefined();
      expect(body.stage.id).toBeDefined();
      expect(body.stage.name).toBeDefined();
      expect(Array.isArray(body.messages)).toBe(true);
    });
  });

  // ─── Update ────────────────────────────────────────────────────────────────

  test.describe("Update", () => {
    test("PATCH /api/leads/[id] name updates successfully", async ({ api }) => {
      const lead = await api.createTestLead();
      const newName = `Updated Name ${Date.now()}`;
      const res = await api.asAdmin().patch(`/api/leads/${lead.id}`, { name: newName });

      expect(res.status).toBe(200);
      const updated = res.data as { id: string; name: string };
      expect(updated.name).toBe(newName);
    });

    test("PATCH /api/leads/[id] notes updates successfully", async ({ api }) => {
      const lead = await api.createTestLead();
      const newNotes = "Updated notes for testing";
      const res = await api.asAdmin().patch(`/api/leads/${lead.id}`, { notes: newNotes });

      expect(res.status).toBe(200);
      const updated = res.data as { id: string; notes: string };
      expect(updated.notes).toBe(newNotes);
    });
  });

  // ─── Delete ────────────────────────────────────────────────────────────────

  test.describe("Delete", () => {
    test("DELETE /api/leads/[id] soft deletes the lead", async ({ api }) => {
      const lead = await api.createTestLead();
      const res = await api.asAdmin().delete(`/api/leads/${lead.id}`);

      expect(res.status).toBe(200);
      const body = res.data as { success: boolean };
      expect(body.success).toBe(true);
    });

    test("Deleted lead does not appear in GET /api/leads", async ({ api }) => {
      const pipelineId = await api.getPipelineId();
      const lead = await api.createTestLead();
      await api.asAdmin().delete(`/api/leads/${lead.id}`);

      const res = await api.asAdmin().get(`/api/leads?pipelineId=${pipelineId}&limit=100`);
      const body = res.data as { leads: { id: string }[] };
      const found = body.leads.find((l) => l.id === lead.id);
      expect(found).toBeUndefined();
    });

    test("GET deleted lead by id returns 404", async ({ api }) => {
      const lead = await api.createTestLead();
      await api.asAdmin().delete(`/api/leads/${lead.id}`);

      const res = await api.asAdmin().get(`/api/leads/${lead.id}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── Stage Transitions ────────────────────────────────────────────────────

  test.describe("Stage Transitions", () => {
    test("PATCH /api/leads/[id]/stage without stageId returns 400", async ({ api }) => {
      const lead = await api.createTestLead();
      const res = await api.asAdmin().patch(`/api/leads/${lead.id}/stage`, {});

      expect(res.status).toBe(400);
    });

    test("PATCH /api/leads/[id]/stage with valid transition and required fields returns 200", async ({ api }) => {
      // Get a lead in "New Lead" stage
      const lead = await api.getLeadInStage("New Lead");
      const contactedStageId = await api.getStageId("Contacted");

      // "Contacted" requires contact_method field
      const requiredFields = REQUIRED_STAGE_FIELDS["Contacted"];
      const fieldValues: Record<string, string> = {};
      for (const f of requiredFields) {
        fieldValues[f.key] = f.testValue;
      }

      const res = await api.asAdmin().patch(`/api/leads/${lead.id}/stage`, {
        stageId: contactedStageId,
        fieldValues,
      });

      expect(res.status).toBe(200);
      const body = res.data as { success: boolean; leadId: string; stageId: string };
      expect(body.success).toBe(true);
      expect(body.leadId).toBe(lead.id);
      expect(body.stageId).toBe(contactedStageId);
    });

    test("PATCH /api/leads/[id]/stage with invalid transition returns 403", async ({ api }) => {
      // Get a lead in "New Lead" stage - create a fresh one to be certain
      const lead = await api.createTestLead();

      // "New Lead" cannot go to "Interested" (must go through "Contacted" first)
      const interestedStageId = await api.getStageId("Interested");

      const res = await api.asAdmin().patch(`/api/leads/${lead.id}/stage`, {
        stageId: interestedStageId,
      });

      expect(res.status).toBe(403);
    });

    test("PATCH /api/leads/[id]/stage with missing required fields returns 400", async ({ api }) => {
      // Create a fresh lead in "New Lead" stage
      const lead = await api.createTestLead();
      const contactedStageId = await api.getStageId("Contacted");

      // Moving to "Contacted" without providing contact_method should fail
      const res = await api.asAdmin().patch(`/api/leads/${lead.id}/stage`, {
        stageId: contactedStageId,
      });

      expect(res.status).toBe(400);
      const body = res.data as { error: string; missingFields: { fieldKey: string }[] };
      expect(body.error).toContain("Required fields missing");
      expect(body.missingFields.length).toBeGreaterThan(0);
    });

    test("PATCH /api/leads/[id]/stage to stage without required fields auto-succeeds", async ({ api }) => {
      // Create a fresh lead in "New Lead" stage
      const lead = await api.createTestLead();
      const lostStageId = await api.getStageId("Lost");

      // "Lost" has no required fields, so transition should succeed without fieldValues
      const res = await api.asAdmin().patch(`/api/leads/${lead.id}/stage`, {
        stageId: lostStageId,
      });

      expect(res.status).toBe(200);
      const body = res.data as { success: boolean; leadId: string; stageId: string };
      expect(body.success).toBe(true);
      expect(body.stageId).toBe(lostStageId);
    });
  });

  // ─── Stage Data ────────────────────────────────────────────────────────────

  test.describe("Stage Data", () => {
    test("GET /api/leads/[id]/stage-data returns field values", async ({ api }) => {
      // First, create a lead and move it through a stage with field data
      const lead = await api.createTestLead();
      const contactedStageId = await api.getStageId("Contacted");

      const requiredFields = REQUIRED_STAGE_FIELDS["Contacted"];
      const fieldValues: Record<string, string> = {};
      for (const f of requiredFields) {
        fieldValues[f.key] = f.testValue;
      }

      // Move lead to "Contacted" with field values
      await api.asAdmin().patch(`/api/leads/${lead.id}/stage`, {
        stageId: contactedStageId,
        fieldValues,
      });

      // Now fetch stage data
      const res = await api.asAdmin().get(`/api/leads/${lead.id}/stage-data`);

      expect(res.status).toBe(200);
      const body = res.data as Array<{
        stageName: string;
        stageId: string;
        fields: Array<{ fieldKey: string; value: string | null }>;
      }>;
      expect(Array.isArray(body)).toBe(true);
      // Should have at least one stage group with the contact_method field
      const contactedGroup = body.find((g) => g.stageId === contactedStageId);
      expect(contactedGroup).toBeDefined();
      expect(contactedGroup!.fields.length).toBeGreaterThan(0);
    });
  });
});
