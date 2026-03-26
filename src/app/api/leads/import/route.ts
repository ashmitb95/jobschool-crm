import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { leads, stages, users, metaFormMappings, pipelines } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

// Common column name mappings (case-insensitive)
const COLUMN_MAP: Record<string, string> = {
  name: "name", "full name": "name", "fullname": "name",
  phone: "phone", "phone number": "phone", "phonenumber": "phone", mobile: "phone", "mobile number": "phone",
  email: "email", "email address": "email",
  source: "source",
  form: "formName", "form name": "formName", "formname": "formName",
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
      } else if (char === "\n" || (char === "\r" && text[i + 1] === "\n")) {
        row.push(current.trim());
        if (row.some((c) => c !== "")) rows.push(row);
        row = [];
        current = "";
        if (char === "\r") i++;
      } else {
        current += char;
      }
    }
  }
  // Last row
  row.push(current.trim());
  if (row.some((c) => c !== "")) rows.push(row);

  return rows;
}

const BATCH_SIZE = 100;

// POST /api/leads/import — Import leads from CSV
export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const pipelineId = formData.get("pipelineId") as string | null;
  const columnMapJson = formData.get("columnMap") as string | null;

  if (!file) {
    return apiError("file is required", 400);
  }

  const fixedPipelineId = pipelineId || null;

  // ── Pre-load all lookups upfront ──────────────────────────────────────────

  // Form→pipeline mappings (keyed by both formName and formId)
  const formPipelineMap = new Map<string, string>();
  if (!fixedPipelineId && user.orgId) {
    const mappings = await db.select({
      formId: metaFormMappings.formId,
      formName: metaFormMappings.formName,
      pipelineId: metaFormMappings.pipelineId,
    }).from(metaFormMappings).where(eq(metaFormMappings.orgId, user.orgId));

    // Also try to fetch form names from Meta API to fill gaps
    const { organizations: orgsTable } = await import("@/lib/db/schema");
    const [org] = await db.select().from(orgsTable).where(eq(orgsTable.id, user.orgId)).limit(1);
    const orgSettings = org?.settings ? JSON.parse(org.settings) : {};
    let metaFormNames = new Map<string, string>(); // formId → formName
    if (orgSettings.meta?.pageId && orgSettings.meta?.pageAccessToken) {
      try {
        const formsRes = await fetch(
          `https://graph.facebook.com/v25.0/${orgSettings.meta.pageId}/leadgen_forms?fields=id,name&limit=100&access_token=${orgSettings.meta.pageAccessToken}`
        );
        if (formsRes.ok) {
          const data = await formsRes.json();
          for (const f of (data.data || [])) {
            metaFormNames.set(f.id, f.name);
          }
        }
      } catch { /* ignore */ }
    }

    for (const m of mappings) {
      // Key by stored formName
      if (m.formName) formPipelineMap.set(m.formName.toLowerCase().trim(), m.pipelineId);
      // Key by formId
      formPipelineMap.set(m.formId.toLowerCase().trim(), m.pipelineId);
      // Key by Meta API form name (fills the gap when formName is null in DB)
      const apiName = metaFormNames.get(m.formId);
      if (apiName) formPipelineMap.set(apiName.toLowerCase().trim(), m.pipelineId);
    }
  }

  // Org default pipeline
  let orgDefaultPipelineId: string | null = fixedPipelineId;
  if (!orgDefaultPipelineId && user.orgId) {
    const [firstPipeline] = await db.select({ id: pipelines.id }).from(pipelines)
      .where(and(eq(pipelines.orgId, user.orgId), isNull(pipelines.deletedAt))).limit(1);
    orgDefaultPipelineId = firstPipeline?.id || null;
  }

  // All stages across all org pipelines (for stage name + default stage resolution)
  const allStages = user.orgId
    ? await db.select({ id: stages.id, name: stages.name, pipelineId: stages.pipelineId, isDefault: stages.isDefault })
        .from(stages)
        .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
        .where(eq(pipelines.orgId, user.orgId))
    : [];

  // Build per-pipeline lookups
  const pipelineDefaultStage = new Map<string, string>();
  const pipelineStageNames = new Map<string, Map<string, string>>();

  for (const s of allStages) {
    const plId = s.pipelineId!;
    if (s.isDefault && !pipelineDefaultStage.has(plId)) {
      pipelineDefaultStage.set(plId, s.id);
    }
    if (!pipelineStageNames.has(plId)) pipelineStageNames.set(plId, new Map());
    pipelineStageNames.get(plId)!.set(s.name.toLowerCase().trim(), s.id);
  }
  // Fallback: if no default stage, use first stage seen
  for (const s of allStages) {
    const plId = s.pipelineId!;
    if (!pipelineDefaultStage.has(plId)) pipelineDefaultStage.set(plId, s.id);
  }

  // Org users for owner matching
  const userLookup = new Map<string, string>();
  if (user.orgId) {
    const orgUsers = await db.select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users).where(eq(users.orgId, user.orgId));
    for (const u of orgUsers) {
      userLookup.set(u.displayName.toLowerCase().trim(), u.id);
      userLookup.set(u.username.toLowerCase().trim(), u.id);
    }
  }

  // ── Parse CSV ─────────────────────────────────────────────────────────────

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return apiError("CSV must have at least a header row and one data row", 400);

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Build column mapping
  let colMap: Record<number, string> = {};
  if (columnMapJson) {
    try {
      const custom = JSON.parse(columnMapJson) as Record<string, string>;
      for (const [idx, field] of Object.entries(custom)) {
        if (field && field !== "skip") colMap[Number(idx)] = field;
      }
    } catch {
      return apiError("Invalid columnMap JSON", 400);
    }
  } else {
    for (let i = 0; i < headers.length; i++) {
      const normalized = headers[i].toLowerCase().trim();
      const mapped = COLUMN_MAP[normalized];
      if (mapped) colMap[i] = mapped;
    }
  }

  const mappedFields = Object.values(colMap);
  if (!mappedFields.includes("name") || !mappedFields.includes("phone")) {
    return apiError("CSV must have Name and Phone columns", 400);
  }

  // ── Process rows into insert batch ────────────────────────────────────────

  const errors: { row: number; reason: string }[] = [];
  const seen = new Set<string>();
  let imported = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  type LeadRow = typeof leads.$inferInsert;
  let batch: LeadRow[] = [];

  async function flushBatch() {
    if (batch.length === 0) return;
    await db.insert(leads).values(batch);
    batch = [];
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2;

    const coreFields: Record<string, string> = {};
    const metadataFields: Record<string, string> = {};

    for (const [colIdx, field] of Object.entries(colMap)) {
      const value = row[Number(colIdx)] || "";
      if (!value) continue;
      if (field === "metadata") {
        metadataFields[headers[Number(colIdx)] || `col_${colIdx}`] = value;
      } else if (field !== "skip") {
        coreFields[field] = value;
      }
    }

    const name = coreFields.name?.trim();
    const phone = coreFields.phone?.trim();

    if (!name || !phone) {
      errors.push({ row: rowNum, reason: "Missing name or phone" });
      skipped++;
      continue;
    }

    const phoneKey = phone.replace(/\D/g, "");
    if (seen.has(phoneKey)) {
      skipped++;
      continue;
    }
    seen.add(phoneKey);

    // Resolve pipeline
    let rowPipelineId = fixedPipelineId;
    if (!rowPipelineId && coreFields.formName) {
      rowPipelineId = formPipelineMap.get(coreFields.formName.trim().toLowerCase()) || null;
    }
    if (!rowPipelineId) rowPipelineId = orgDefaultPipelineId;

    if (!rowPipelineId) {
      errors.push({ row: rowNum, reason: "No pipeline found for this lead" });
      skipped++;
      continue;
    }

    // Resolve stage
    let resolvedStageId = pipelineDefaultStage.get(rowPipelineId) || null;
    if (!resolvedStageId) {
      errors.push({ row: rowNum, reason: "Pipeline has no stages" });
      skipped++;
      continue;
    }

    if (coreFields.stage) {
      const nameMap = pipelineStageNames.get(rowPipelineId);
      const matchedId = nameMap?.get(coreFields.stage.trim().toLowerCase());
      if (matchedId) {
        resolvedStageId = matchedId;
      } else {
        metadataFields.originalStage = coreFields.stage.trim();
      }
    }

    // Resolve owner
    let ownerId: string | null = null;
    if (coreFields.owner) {
      ownerId = userLookup.get(coreFields.owner.trim().toLowerCase()) || null;
      if (!ownerId) metadataFields.originalOwner = coreFields.owner.trim();
    }

    if (coreFields.formName) metadataFields.formName = coreFields.formName;
    metadataFields.importedAt = now;
    metadataFields.originalRow = String(rowNum);

    batch.push({
      id: createId(),
      name,
      phone,
      email: coreFields.email || null,
      source: coreFields.source || "manual",
      stageId: resolvedStageId,
      pipelineId: rowPipelineId,
      ownerId,
      metadata: JSON.stringify(metadataFields),
      createdAt: now,
      updatedAt: now,
    });

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }

    imported++;
  }

  // Flush remaining
  await flushBatch();

  await logAudit({
    userId: user.id,
    orgId: user.orgId,
    action: "leads.imported",
    entityType: "lead",
    metadata: { pipelineId, imported, skipped, errorCount: errors.length },
  });

  return apiSuccess({ imported, skipped, errors: errors.slice(0, 50) });
}
