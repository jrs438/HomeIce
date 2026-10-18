import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rideRules, rides } from "@/db/schema";
import { and, eq, gte, inArray } from "drizzle-orm";
import { utcToZonedParts, dayOfWeekOfDateString } from "@/lib/dates";
import { FAMILY_TIMEZONE } from "@/lib/family-constants";
import { notifyRideCancelled, notifyRideDetailsChanged } from "@/lib/ride-notify";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.query.rideRules.findFirst({ where: eq(rideRules.id, id) });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  // Nothing else re-checks a materialized ride against its rule later, so an
  // edited route/time has to be pushed onto already-generated, not-yet-happened
  // rides here — otherwise they're stuck at the old values forever, sitting in
  // the Rides tab with no rule left that explains them.
  const routeChanged =
    existing.kind !== updated.kind || existing.from !== updated.from || existing.to !== updated.to || existing.time !== updated.time;
  if (routeChanged && existing.time && updated.time) {
    const today = utcToZonedParts(new Date(), FAMILY_TIMEZONE).date;
    const candidates = await db.query.rides.findMany({
      where: and(
        eq(rides.kind, existing.kind),
        eq(rides.from, existing.from),
        eq(rides.to, existing.to),
        eq(rides.time, existing.time),
        gte(rides.date, today)
      ),
    });
    const matchingRides = candidates.filter((r) => dayOfWeekOfDateString(r.date) === existing.dayOfWeek);
    for (const r of matchingRides) {
      const [saved] = await db
        .update(rides)
        .set({ kind: updated.kind, from: updated.from, to: updated.to, time: updated.time, kidIds: updated.kidIds, updatedAt: new Date() })
        .where(eq(rides.id, r.id))
        .returning();
      if (saved.driverType !== "unassigned") await notifyRideDetailsChanged(saved);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rule = await db.query.rideRules.findFirst({ where: eq(rideRules.id, id) });
  if (rule && rule.time) {
    const today = utcToZonedParts(new Date(), FAMILY_TIMEZONE).date;
    const candidates = await db.query.rides.findMany({
      where: and(
        eq(rides.kind, rule.kind),
        eq(rides.from, rule.from),
        eq(rides.to, rule.to),
        eq(rides.time, rule.time),
        gte(rides.date, today)
      ),
    });
    const matchingRides = candidates.filter((r) => dayOfWeekOfDateString(r.date) === rule.dayOfWeek);
    for (const r of matchingRides) await notifyRideCancelled(r);
    if (matchingRides.length) {
      await db.delete(rides).where(inArray(rides.id, matchingRides.map((r) => r.id)));
    }
  }

  await db.delete(rideRules).where(eq(rideRules.id, id));
  return NextResponse.json({ ok: true });
}
