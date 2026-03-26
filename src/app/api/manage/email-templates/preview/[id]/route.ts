import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { renderEmail } from "@/lib/email/render";

const SAMPLE_VARIABLES = {
  name: "Ravi Kumar",
  phone: "+91 98765 43210",
  email: "ravi@example.com",
  stage: "Contacted",
  cv_link: "https://jobschool.com/cv",
};

// GET /api/manage/email-templates/preview/[id] — Render with sample data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
  if (!template) return apiError("Template not found", 404);

  try {
    const html = renderEmail(template.filename, SAMPLE_VARIABLES);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return apiError("Failed to render template", 500);
  }
}
