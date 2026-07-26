import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { externalDrivers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Partial<typeof externalDrivers.$inferInsert> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.label !== undefined) patch.label = body.label;
  if (body.phone !== undefined) patch.phone = body.phone || null;
  if (body.email !== undefined) patch.email = body.email || null;
  if (body.notes !== undefined) patch.notes = body.notes || null;

  const [updated] = await db.update(externalDrivers).set(patch).where(eq(externalDrivers.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(externalDrivers).where(eq(externalDrivers.id, id));
  return NextResponse.json({ ok: true });
}
