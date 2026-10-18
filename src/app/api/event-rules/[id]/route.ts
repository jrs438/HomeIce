import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventRules, events, rides, rideRules } from "@/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";
import { notifyRideCancelled, notifyRideDetailsChanged } from "@/lib/ride-notify";
import { startOfWeek, addDays, utcToZonedParts, weeksToGenerate, dayOfWeekOfDateString } from "@/lib/dates";
import { FAMILY_TIMEZONE } from "@/lib/family-constants";
import { generateEventsForWeek } from "@/lib/generate-events";
import { generateRidesForWeek } from "@/lib/generate-rides";

const WEEKS_AHEAD = 4;

// Deletes a linked ride_rule and cancels/removes any not-yet-happened ride
// it already generated — used when a drop-off/pick-up leg is turned off on
// an existing recurring event, mirroring the cleanup DELETE below does for
// the whole series.
async function removeRideRuleAndFutureRides(rule: typeof rideRules.$inferSelect) {
  const today = utcToZonedParts(new Date(), FAMILY_TIMEZONE).date;
  const candidates = await db.query.rides.findMany({
    where: and(eq(rides.kind, rule.kind), eq(rides.from, rule.from), eq(rides.to, rule.to), gte(rides.date, today)),
  });
  // Matching on route alone would also catch a DIFFERENT day's rides that
  // happen to share the same kind/from/to (e.g. the same gym on both Monday
  // and Thursday) and wrongly touch rides this rule never generated.
  const matchingRides = candidates.filter((r) => dayOfWeekOfDateString(r.date) === rule.dayOfWeek);
  for (const r of matchingRides) await notifyRideCancelled(r);
  if (matchingRides.length) {
    await db.delete(rides).where(inArray(rides.id, matchingRides.map((r) => r.id)));
  }
  await db.delete(rideRules).where(eq(rideRules.id, rule.id));
}

// Updates already-materialized, not-yet-happened rides that came from a
// linked ride_rule so an edit (from/to/time) takes effect on this week's
// rides too, not just ones generated from here on — mirroring what
// removeRideRuleAndFutureRides does for a leg turned off entirely.
async function syncFutureRideLegTimes(
  oldRule: typeof rideRules.$inferSelect,
  next: { from: string; to: string; time: string; kidIds: string[] }
) {
  const today = utcToZonedParts(new Date(), FAMILY_TIMEZONE).date;
  const candidates = await db.query.rides.findMany({
    where: and(eq(rides.kind, oldRule.kind), eq(rides.from, oldRule.from), eq(rides.to, oldRule.to), gte(rides.date, today)),
  });
  const matchingRides = candidates.filter((r) => dayOfWeekOfDateString(r.date) === oldRule.dayOfWeek);
  for (const r of matchingRides) {
    const [updated] = await db
      .update(rides)
      .set({ from: next.from, to: next.to, time: next.time, kidIds: next.kidIds, updatedAt: new Date() })
      .where(eq(rides.id, r.id))
      .returning();
    if (updated.driverType !== "unassigned") await notifyRideDetailsChanged(updated);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof eventRules.$inferInsert> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.dayOfWeek !== undefined) patch.dayOfWeek = body.dayOfWeek;
  if (body.intervalWeeks !== undefined) patch.intervalWeeks = body.intervalWeeks;
  if (body.anchorDate !== undefined) patch.anchorDate = body.anchorDate;
  if (body.endDate !== undefined) patch.endDate = body.endDate || null;
  if (body.startTime !== undefined) patch.startTime = body.startTime;
  if (body.endTime !== undefined) patch.endTime = body.endTime || null;
  if (body.location !== undefined) patch.location = body.location || null;
  if (body.kidIds !== undefined) patch.kidIds = body.kidIds;
  if (body.notes !== undefined) patch.notes = body.notes || null;
  if (body.active !== undefined) patch.active = body.active;

  // A PATCH that only touches the linked ride rule (e.g. adding a "needs a
  // ride" leg without changing anything else about the recurring event)
  // leaves patch empty, and drizzle rejects an empty .set({}) — so skip the
  // update entirely and just read the current row back in that case.
  const updated = Object.keys(patch).length
    ? (await db.update(eventRules).set(patch).where(eq(eventRules.id, id)).returning())[0]
    : await db.query.eventRules.findFirst({ where: eq(eventRules.id, id) });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ride needs can now be added, changed, or removed after the fact — not
  // just set at creation — so a recurring event that came in without one
  // (e.g. via photo capture) can get one added later.
  if (body.needsDropoff !== undefined || body.needsPickup !== undefined) {
    const linked = await db.query.rideRules.findMany({ where: eq(rideRules.eventRuleId, id) });

    if (body.needsDropoff !== undefined) {
      const existing = linked.find((r) => r.kind === "activity_dropoff");
      if (body.needsDropoff && body.dropoffFrom && body.dropoffTo) {
        if (existing) {
          const next = { from: body.dropoffFrom, to: body.dropoffTo, time: updated.startTime, kidIds: updated.kidIds };
          await db
            .update(rideRules)
            .set({
              dayOfWeek: updated.dayOfWeek,
              intervalWeeks: updated.intervalWeeks,
              anchorDate: updated.anchorDate,
              ...next,
            })
            .where(eq(rideRules.id, existing.id));
          await syncFutureRideLegTimes(existing, next);
        } else {
          await db.insert(rideRules).values({
            label: `${updated.title} drop-off`,
            dayOfWeek: updated.dayOfWeek,
            intervalWeeks: updated.intervalWeeks,
            anchorDate: updated.anchorDate,
            kind: "activity_dropoff",
            kidIds: updated.kidIds,
            from: body.dropoffFrom,
            to: body.dropoffTo,
            time: updated.startTime,
            eventRuleId: id,
          });
        }
      } else if (existing) {
        await removeRideRuleAndFutureRides(existing);
      }
    }

    if (body.needsPickup !== undefined) {
      const existing = linked.find((r) => r.kind === "activity_pickup");
      if (body.needsPickup && body.pickupFrom && body.pickupTo) {
        // A pick-up leg should track when the class actually ENDS. An
        // explicit pickupTime from the form wins; otherwise fall back to
        // the event's own end time, and only as a last resort to its start
        // time — which is only correct by coincidence and was the source
        // of pick-ups silently getting scheduled for the start of class
        // when no end time had been set.
        const time = body.pickupTime || updated.endTime || updated.startTime;
        if (existing) {
          const next = { from: body.pickupFrom, to: body.pickupTo, time, kidIds: updated.kidIds };
          await db
            .update(rideRules)
            .set({
              dayOfWeek: updated.dayOfWeek,
              intervalWeeks: updated.intervalWeeks,
              anchorDate: updated.anchorDate,
              ...next,
            })
            .where(eq(rideRules.id, existing.id));
          await syncFutureRideLegTimes(existing, next);
        } else {
          await db.insert(rideRules).values({
            label: `${updated.title} pick-up`,
            dayOfWeek: updated.dayOfWeek,
            intervalWeeks: updated.intervalWeeks,
            anchorDate: updated.anchorDate,
            kind: "activity_pickup",
            kidIds: updated.kidIds,
            from: body.pickupFrom,
            to: body.pickupTo,
            time,
            eventRuleId: id,
          });
        }
      } else if (existing) {
        await removeRideRuleAndFutureRides(existing);
      }
    }
  }

  // Backfill on either kind of change: a newly-added ride need should apply
  // to weeks already materialized, not just future ones — and setting or
  // extending an end date should front-load the rest of the series right
  // away rather than waiting on the rolling weekly cron to eventually get
  // there.
  if (body.needsDropoff !== undefined || body.needsPickup !== undefined || body.endDate !== undefined) {
    const weekStart = startOfWeek(new Date());
    const weeks = weeksToGenerate(weekStart, updated.endDate, WEEKS_AHEAD);
    for (let w = 0; w < weeks; w++) {
      const start = addDays(weekStart, w * 7);
      await generateEventsForWeek(start);
      await generateRidesForWeek(start);
    }
  }

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
    const linkedRides = await db.query.rides.findMany({ where: eq(rides.eventId, instance.id) });
    for (const r of linkedRides) await notifyRideCancelled(r);
    await db.delete(rides).where(eq(rides.eventId, instance.id));
  }
  if (futureInstances.length) {
    await db.delete(events).where(
      and(eq(events.source, "recurring"), eq(events.sourceRef, id), gte(events.start, now))
    );
  }

  const today = utcToZonedParts(now, FAMILY_TIMEZONE).date;
  const linkedRideRules = await db.query.rideRules.findMany({ where: eq(rideRules.eventRuleId, id) });
  for (const rr of linkedRideRules) {
    const candidates = await db.query.rides.findMany({
      where: and(eq(rides.kind, rr.kind), eq(rides.from, rr.from), eq(rides.to, rr.to), gte(rides.date, today)),
    });
    const matchingRides = candidates.filter((r) => dayOfWeekOfDateString(r.date) === rr.dayOfWeek);
    for (const r of matchingRides) await notifyRideCancelled(r);
    if (matchingRides.length) {
      await db.delete(rides).where(inArray(rides.id, matchingRides.map((r) => r.id)));
    }
  }

  await db.delete(eventRules).where(eq(eventRules.id, id));
  return NextResponse.json({ ok: true });
}
