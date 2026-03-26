import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth";
import { apiSuccess, apiCreated, apiError } from "@/lib/api-response";
import { z } from "zod";
import { extractVariables, readTemplate } from "@/lib/email/render";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  filename: z.string().min(1),
  subject: z.string().min(1),
});

// GET /api/manage/email-templates — List registered templates
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const templates = await db.select().from(emailTemplates);
  return apiSuccess(templates);
}

// POST /api/manage/email-templates — Register a template
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid input", 400);

  // Read the file to auto-detect variables
  let variables: string[] = [];
  try {
    const html = readTemplate(parsed.data.filename);
    variables = extractVariables(html);
  } catch {
    return apiError("Template file not found on disk", 400);
  }

  const [created] = await db.insert(emailTemplates).values({
    name: parsed.data.name,
    description: parsed.data.description || null,
    filename: parsed.data.filename,
    subject: parsed.data.subject,
    variables: JSON.stringify(variables),
  }).returning();

  return apiCreated(created);
}
