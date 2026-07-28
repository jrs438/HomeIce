import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rides } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifyRideDriverChange, notifyRideCancelled, notifyRideDetailsChanged } from "@/lib/ride-notify";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const before = await db.query.rides.findFirst({ where: eq(rides.id, id) });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Partial<typeof rides.$inferInsert> = { updatedAt: new Date() };
  if (body.date !== undefined) patch.date = body.date;
  if (body.time !== undefined) patch.time = body.time;
  if (body.kind !== undefined) patch.kind = body.kind;
  if (body.kidIds !== undefined) patch.kidIds = body.kidIds;
  if (body.from !== undefined) patch.from = body.from;
  if (body.to !== undefined) patch.to = body.to;
  if (body.confirmed !== undefined) patch.confirmed = body.confirmed;

  const driverChanged =
    body.driverType !== undefined && (body.driverType !== before.driverType || body.driverId !== before.driverId);

  const detailsChanged =
    (body.date !== undefined && body.date !== before.date) ||
    (body.time !== undefined && body.time !== before.time) ||
    (body.from !== undefined && body.from !== before.from) ||
    (body.to !== undefined && body.to !== before.to);

  if (body.driverType !== undefined) patch.driverType = body.driverType;
  if (body.driverId !== undefined) patch.driverId = body.driverId || null;
  if (driverChanged || (detailsChanged && before.driverType !== "unassigned")) {
    patch.icsSequence = (before.icsSequence ?? 0) + 1;
  }

  const [updated] = await db.update(rides).set(patch).where(eq(rides.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let emailWarnings: string[] = [];
  if (driverChanged) {
    emailWarnings = await notifyRideDriverChange(
      updated,
      { driverType: before.driverType, driverId: before.driverId },
      { driverType: updated.driverType, driverId: updated.driverId }
    );
  } else if (detailsChanged) {
    emailWarnings = await notifyRideDetailsChanged(updated);
  }

  return NextResponse.json(emailWarnings.length ? { ...updated, emailWarnings } : updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ride = await db.query.rides.findFirst({ where: eq(rides.id, id) });
  if (ride) await notifyRideCancelled(ride);
  await db.delete(rides).where(eq(rides.id, id));
  return NextResponse.json({ ok: true });
}
