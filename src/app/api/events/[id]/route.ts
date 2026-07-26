import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) patch.title = body.title;
  if (body.start !== undefined) patch.start = new Date(body.start);
  if (body.end !== undefined) patch.end = body.end ? new Date(body.end) : null;
  if (body.allDay !== undefined) patch.allDay = body.allDay;
  if (body.location !== undefined) patch.location = body.location || null;
  if (body.kidIds !== undefined) patch.kidIds = body.kidIds;
  if (body.status !== undefined) patch.status = body.status;
  if (body.notes !== undefined) patch.notes = body.notes || null;

  const [updated] = await db.update(events).set(patch).where(eq(events.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(events).where(eq(events.id, id));
  return NextResponse.json({ ok: true });
}
