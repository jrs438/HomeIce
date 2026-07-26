import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chores } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof chores.$inferInsert> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.memberId !== undefined) patch.memberId = body.memberId || null;
  if (body.cadence !== undefined) patch.cadence = body.cadence;
  if (body.done !== undefined) patch.done = body.done;
  if (body.points !== undefined) patch.points = body.points;

  const [updated] = await db.update(chores).set(patch).where(eq(chores.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(chores).where(eq(chores.id, id));
  return NextResponse.json({ ok: true });
}
