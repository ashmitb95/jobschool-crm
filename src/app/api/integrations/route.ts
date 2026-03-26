import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import type { OrgSettings } from "@/types";

function maskSecret(value?: string): string | null {
  if (!value) return null;
  if (value.length <= 4) return "****";
  return "****" + value.slice(-4);
}

// GET /api/integrations — returns integration config with credentials masked
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (user instanceof NextResponse) return user;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId!)).limit(1);
  if (!org) return NextResponse.json({ success: false, error: { message: "Org not found" } }, { status: 404 });

  const settings: OrgSettings = org.settings ? JSON.parse(org.settings) : {};

  return NextResponse.json({
    success: true,
    data: {
      whatsapp: {
        phoneNumberId: settings.whatsapp?.phoneNumberId || null,
        accessToken: maskSecret(settings.whatsapp?.accessToken),
        configured: !!(settings.whatsapp?.phoneNumberId && settings.whatsapp?.accessToken),
      },
      email: {
        provider: settings.email?.provider || "resend",
        apiKey: maskSecret(settings.email?.apiKey),
        fromAddress: settings.email?.fromAddress || null,
        fromName: settings.email?.fromName || null,
        configured: !!settings.email?.apiKey,
      },
    },
  });
}

// PATCH /api/integrations — update whatsapp and/or email credentials
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId!)).limit(1);
  if (!org) return NextResponse.json({ success: false, error: { message: "Org not found" } }, { status: 404 });

  const settings: OrgSettings = org.settings ? JSON.parse(org.settings) : {};

  if (body.whatsapp) {
    settings.whatsapp = {
      ...settings.whatsapp,
      ...body.whatsapp,
    };
  }

  if (body.email) {
    settings.email = {
      ...settings.email,
      ...body.email,
    };
  }

  await db.update(organizations).set({
    settings: JSON.stringify(settings),
    updatedAt: new Date().toISOString(),
  }).where(eq(organizations.id, user.orgId!));

  return NextResponse.json({ success: true });
}
