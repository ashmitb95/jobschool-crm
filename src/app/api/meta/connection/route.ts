import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { updateMetaConnectionSchema } from "@/lib/validations";
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
  return NextResponse.json({
    success: true,
    data: {
      pageId: settings.meta?.pageId || null,
      pageName: settings.meta?.pageName || null,
      isConnected: !!(settings.meta?.pageId && settings.meta?.pageAccessToken),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = updateMetaConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
  }

  const { pageId, pageAccessToken } = parsed.data;

  // Validate token by calling Graph API
  const verifyRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}?fields=name&access_token=${pageAccessToken}`);
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    return NextResponse.json({
      success: false,
      error: { message: err?.error?.message || "Invalid Page ID or Access Token" },
    }, { status: 400 });
  }

  const pageData = await verifyRes.json();
  const pageName = pageData.name || "Unknown Page";

  // Update org settings
  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId!)).limit(1);
  if (!org) {
    return NextResponse.json({ success: false, error: { message: "Organization not found" } }, { status: 404 });
  }

  const settings: OrgSettings = org.settings ? JSON.parse(org.settings) : {};
  settings.meta = { pageId, pageAccessToken, pageName };

  await db.update(organizations).set({
    settings: JSON.stringify(settings),
    updatedAt: new Date().toISOString(),
  }).where(eq(organizations.id, user.orgId!));

  return NextResponse.json({
    success: true,
    data: { pageId, pageName, isConnected: true },
  });
}
