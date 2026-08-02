import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sitterShifts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof sitterShifts.$inferInsert> = { updatedAt: new Date() };
  if (body.sitterId !== undefined) patch.sitterId = body.sitterId || null;
  if (body.date !== undefined) patch.date = body.date;
  if (body.hours !== undefined) patch.hours = String(body.hours);
  if (body.rate !== undefined) patch.rate = body.rate !== null && body.rate !== "" ? String(body.rate) : null;
  if (body.notes !== undefined) patch.notes = body.notes || null;
  if (body.paid !== undefined) patch.paid = body.paid;

  const [updated] = await db.update(sitterShifts).set(patch).where(eq(sitterShifts.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(sitterShifts).where(eq(sitterShifts.id, id));
  return NextResponse.json({ ok: true });
}
