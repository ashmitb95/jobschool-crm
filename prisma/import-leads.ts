import { config } from "dotenv";
config();

import { readFileSync } from "fs";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, isNull } from "drizzle-orm";
import { leads, stages, pipelines, organizations } from "../src/lib/db/schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

function normalizePhone(raw: string): string {
  // Strip spaces, dashes, parentheses
  let phone = raw.replace(/[\s\-()]/g, "");

  // Remove leading zeros after country code artifacts
  if (phone.startsWith("0") && phone.length === 10) {
    phone = "+91" + phone;
  }

  // Indian numbers without +91 prefix (10 digits starting with 6-9)
  if (/^\d{10}$/.test(phone) && /^[6-9]/.test(phone)) {
    phone = "+91" + phone;
  }

  // Numbers with 91 prefix but no +
  if (/^91\d{10}$/.test(phone)) {
    phone = "+" + phone;
  }

  // Numbers with 0091 prefix
  if (phone.startsWith("00")) {
    phone = "+" + phone.slice(2);
  }

  // Ensure + prefix for international numbers
  if (/^\+/.test(phone)) return phone;

  return phone;
}

function parseDate(dateStr: string): string {
  // Format: "02/23/2026 6:04am"
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return new Date().toISOString();

  const [, month, day, year, hourStr, minute, ampm] = match;
  let hour = parseInt(hourStr);
  if (ampm.toLowerCase() === "pm" && hour !== 12) hour += 12;
  if (ampm.toLowerCase() === "am" && hour === 12) hour = 0;

  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, parseInt(minute));
  return d.toISOString();
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Remove BOM if present
  let headerLine = lines[0];
  if (headerLine.charCodeAt(0) === 0xfeff) headerLine = headerLine.slice(1);

  const headers = headerLine.split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }

  return rows;
}

async function main() {
  const csvPath = process.argv[2] || resolve(__dirname, "../leads.csv");
  console.log(`Reading CSV from: ${csvPath}`);

  const content = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(content);
  console.log(`Parsed ${rows.length} rows from CSV`);

  // Find the org's default pipeline and default stage
  const [org] = await db.select().from(organizations).limit(1);
  if (!org) {
    console.error("No organization found. Run db:seed first.");
    process.exit(1);
  }

  const [defaultPipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.orgId, org.id), isNull(pipelines.deletedAt)))
    .limit(1);

  if (!defaultPipeline) {
    console.error("No pipeline found. Run db:seed first.");
    process.exit(1);
  }

  const [defaultStage] = await db
    .select()
    .from(stages)
    .where(and(eq(stages.pipelineId, defaultPipeline.id), eq(stages.isDefault, true)))
    .limit(1);

  if (!defaultStage) {
    console.error("No default stage found. Run db:seed first.");
    process.exit(1);
  }

  console.log(`Target: org="${org.name}", pipeline="${defaultPipeline.name}", stage="${defaultStage.name}"`);

  // Get existing phone numbers for idempotency
  const existingLeads = await db
    .select({ phone: leads.phone })
    .from(leads)
    .where(eq(leads.pipelineId, defaultPipeline.id));
  const existingPhones = new Set(existingLeads.map((l) => l.phone));

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const phone = normalizePhone(row["Phone"] || "");
    if (!phone) {
      skipped++;
      continue;
    }

    if (existingPhones.has(phone)) {
      skipped++;
      continue;
    }

    const name = row["Name"] || "Unknown";
    const email = row["Email"] || null;
    const formName = row["Form"] || null;
    const createdAt = parseDate(row["Created"] || "");

    await db.insert(leads).values({
      id: createId(),
      name,
      phone,
      email,
      source: "meta_ads",
      stageId: defaultStage.id,
      pipelineId: defaultPipeline.id,
      metadata: JSON.stringify({ formName, importedFrom: "csv" }),
      createdAt,
      updatedAt: createdAt,
    });

    existingPhones.add(phone);
    imported++;
  }

  console.log(`\n--- Import Complete ---`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (duplicates): ${skipped}`);
  console.log(`  Total leads in pipeline: ${existingPhones.size}`);
}

main().catch(console.error);
