import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rides } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof rides.$inferInsert> = { updatedAt: new Date() };
  if (body.date !== undefined) patch.date = body.date;
  if (body.time !== undefined) patch.time = body.time;
  if (body.kind !== undefined) patch.kind = body.kind;
  if (body.kidIds !== undefined) patch.kidIds = body.kidIds;
  if (body.from !== undefined) patch.from = body.from;
  if (body.to !== undefined) patch.to = body.to;
  if (body.driverType !== undefined) patch.driverType = body.driverType;
  if (body.driverId !== undefined) patch.driverId = body.driverId || null;
  if (body.confirmed !== undefined) patch.confirmed = body.confirmed;

  const [updated] = await db.update(rides).set(patch).where(eq(rides.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(rides).where(eq(rides.id, id));
  return NextResponse.json({ ok: true });
}
