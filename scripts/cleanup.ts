import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const TABLES_TO_CLEAR = [
  "lead_stage_data",
  "lead_activities",
  "messages",
  "leads",
  "candidate_profiles",
  "stage_transitions",
  "stage_fields",
  "stages",
  "message_templates",
  "user_pipelines",
  "pipelines",
  "meta_form_mappings",
  "sessions",
  "audit_logs",
];

async function main() {
  console.log("Starting data cleanup...\n");

  for (const table of TABLES_TO_CLEAR) {
    const result = await client.execute(`DELETE FROM ${table}`);
    console.log(`  Cleared ${table}: ${result.rowsAffected} rows deleted`);
  }

  // Delete non-super_admin users
  const usersResult = await client.execute(`DELETE FROM users WHERE role != 'super_admin'`);
  console.log(`  Cleared users (non super_admin): ${usersResult.rowsAffected} rows deleted`);

  // Delete all organizations
  const orgsResult = await client.execute(`DELETE FROM organizations`);
  console.log(`  Cleared organizations: ${orgsResult.rowsAffected} rows deleted`);

  // Verify clean state
  const [remaining] = (await client.execute(`SELECT COUNT(*) as cnt FROM users`)).rows;
  console.log(`\nDone. ${remaining.cnt} user(s) remaining (super_admin only).`);

  const [orgCount] = (await client.execute(`SELECT COUNT(*) as cnt FROM organizations`)).rows;
  console.log(`${orgCount.cnt} organizations remaining.`);
}

main().catch(console.error);
