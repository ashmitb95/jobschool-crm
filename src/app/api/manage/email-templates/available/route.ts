import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { apiSuccess } from "@/lib/api-response";
import { listAvailableTemplates, readTemplate, extractVariables } from "@/lib/email/render";

// GET /api/manage/email-templates/available — Scan disk for .html template files
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const filenames = listAvailableTemplates();
  const templates = filenames.map((filename) => {
    const html = readTemplate(filename);
    return {
      filename,
      variables: extractVariables(html),
    };
  });

  return apiSuccess(templates);
}
