import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rideRules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof rideRules.$inferInsert> = {};
  if (body.label !== undefined) patch.label = body.label;
  if (body.dayOfWeek !== undefined) patch.dayOfWeek = body.dayOfWeek;
  if (body.kind !== undefined) patch.kind = body.kind;
  if (body.kidIds !== undefined) patch.kidIds = body.kidIds;
  if (body.from !== undefined) patch.from = body.from;
  if (body.to !== undefined) patch.to = body.to;
  if (body.time !== undefined) patch.time = body.time || null;
  if (body.driverType !== undefined) patch.driverType = body.driverType;
  if (body.driverId !== undefined) patch.driverId = body.driverId || null;
  if (body.active !== undefined) patch.active = body.active;

  const [updated] = await db.update(rideRules).set(patch).where(eq(rideRules.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(rideRules).where(eq(rideRules.id, id));
  return NextResponse.json({ ok: true });
}
