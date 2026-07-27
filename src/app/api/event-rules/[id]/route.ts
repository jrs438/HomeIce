import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventRules, events, rides, rideRules } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof eventRules.$inferInsert> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.dayOfWeek !== undefined) patch.dayOfWeek = body.dayOfWeek;
  if (body.intervalWeeks !== undefined) patch.intervalWeeks = body.intervalWeeks;
  if (body.anchorDate !== undefined) patch.anchorDate = body.anchorDate;
  if (body.startTime !== undefined) patch.startTime = body.startTime;
  if (body.endTime !== undefined) patch.endTime = body.endTime || null;
  if (body.location !== undefined) patch.location = body.location || null;
  if (body.kidIds !== undefined) patch.kidIds = body.kidIds;
  if (body.notes !== undefined) patch.notes = body.notes || null;
  if (body.active !== undefined) patch.active = body.active;

  const [updated] = await db.update(eventRules).set(patch).where(eq(eventRules.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Remove not-yet-happened materialized instances (and their rides) so deleting
  // the series doesn't leave orphaned duplicates on the calendar; past occurrences
  // stay as history. Linked ride_rules are removed via the FK's onDelete: cascade.
  const now = new Date();
  const futureInstances = await db.query.events.findMany({
    where: and(eq(events.source, "recurring"), eq(events.sourceRef, id), gte(events.start, now)),
  });
  for (const instance of futureInstances) {
    await db.delete(rides).where(eq(rides.eventId, instance.id));
  }
  if (futureInstances.length) {
    await db.delete(events).where(
      and(eq(events.source, "recurring"), eq(events.sourceRef, id), gte(events.start, now))
    );
  }

  const linkedRideRules = await db.query.rideRules.findMany({ where: eq(rideRules.eventRuleId, id) });
  for (const rr of linkedRideRules) {
    await db.delete(rides).where(and(eq(rides.kind, rr.kind), eq(rides.from, rr.from), eq(rides.to, rr.to), gte(rides.date, now.toISOString().slice(0, 10))));
  }

  await db.delete(eventRules).where(eq(eventRules.id, id));
  return NextResponse.json({ ok: true });
}
