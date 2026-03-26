import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, metaFormMappings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import type { OrgSettings } from "@/types";

const GRAPH_API_VERSION = "v25.0";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (user instanceof NextResponse) return user;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId!)).limit(1);
  if (!org) {
    return NextResponse.json({ success: false, error: { message: "Organization not found" } }, { status: 404 });
  }

  const settings: OrgSettings = org.settings ? JSON.parse(org.settings) : {};
  if (!settings.meta?.pageId || !settings.meta?.pageAccessToken) {
    return NextResponse.json({
      success: false,
      error: { message: "Meta Page not connected. Configure your Page ID and Access Token first." },
    }, { status: 400 });
  }

  // Fetch forms from Graph API
  const initialUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${settings.meta.pageId}/leadgen_forms?fields=id,name,status&limit=100&access_token=${settings.meta.pageAccessToken}`;
  const formsRes = await fetch(initialUrl);
  if (!formsRes.ok) {
    const err = await formsRes.json().catch(() => ({}));
    return NextResponse.json({
      success: false,
      error: { message: err?.error?.message || "Failed to fetch forms from Meta" },
    }, { status: 502 });
  }
  const formsData = await formsRes.json();
  const allForms: Array<{ id: string; name: string; status: string }> = formsData.data || [];

  // Get existing mappings for this org
  const mappings = await db
    .select()
    .from(metaFormMappings)
    .where(eq(metaFormMappings.orgId, user.orgId!));

  const mappingsByFormId = new Map(mappings.map((m) => [m.formId, m.pipelineId]));

  const forms = allForms.map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
    mappedPipelineId: mappingsByFormId.get(f.id) || null,
  }));

  return NextResponse.json({ success: true, data: { forms } });
}
