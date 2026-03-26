import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  subject: z.string().min(1).optional(),
});

// PATCH /api/manage/email-templates/[id] — Update registration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid input", 400);

  const [existing] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
  if (!existing) return apiError("Template not found", 404);

  const [updated] = await db
    .update(emailTemplates)
    .set({
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(emailTemplates.id, id))
    .returning();

  return apiSuccess(updated);
}

// DELETE /api/manage/email-templates/[id] — Unregister
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const [existing] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
  if (!existing) return apiError("Template not found", 404);

  await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  return apiSuccess({ deleted: true });
}
