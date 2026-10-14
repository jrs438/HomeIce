import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { icsFeeds, events, rides } from "@/db/schema";
import { eq, and, ne, ilike, inArray } from "drizzle-orm";
import { notifyRideCancelled } from "@/lib/ride-notify";

/**
 * Cleans up a side effect of merge-ics-duplicates: merging two duplicate
 * calendar events reassigned both sides' linked rides onto the single
 * surviving event (to avoid losing a driver assignment), but when both
 * sides already had their own full drop-off + pick-up, that left the
 * merged event with two of each instead of one. Groups each event's linked
 * rides by kind and, for any kind with more than one, keeps whichever has a
 * real driver assigned (or the first one if none do) and removes the rest.
 *
 * Defaults to a dry run; pass dryRun: false to actually apply it.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const label: string | undefined = body.label;
  const dryRunValue = body.dryRun ?? body.dryrun ?? body.DryRun;
  const dryRun = dryRunValue !== false && dryRunValue !== "false";
  if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 });

  const feed = await db.query.icsFeeds.findFirst({ where: ilike(icsFeeds.label, `%${label}%`) });
  if (!feed) return NextResponse.json({ error: "No feed matching that label" }, { status: 404 });

  const feedEvents = await db.query.events.findMany({
    where: and(eq(events.source, "ics"), eq(events.sourceRef, feed.id), ne(events.status, "cancelled")),
  });
  const eventIds = feedEvents.map((e) => e.id);
  const allRides = eventIds.length ? await db.query.rides.findMany({ where: inArray(rides.eventId, eventIds) }) : [];

  const ridesByEvent = new Map<string, typeof allRides>();
  for (const r of allRides) {
    if (!r.eventId) continue;
    const list = ridesByEvent.get(r.eventId) ?? [];
    list.push(r);
    ridesByEvent.set(r.eventId, list);
  }

  const plan: {
    eventId: string;
    eventTitle: string;
    kind: string;
    keep: { id: string; driverType: string };
    remove: { id: string; driverType: string }[];
  }[] = [];

  for (const event of feedEvents) {
    const linked = ridesByEvent.get(event.id) ?? [];
    const byKind = new Map<string, typeof linked>();
    for (const r of linked) {
      const list = byKind.get(r.kind) ?? [];
      list.push(r);
      byKind.set(r.kind, list);
    }
    for (const [kind, group] of byKind) {
      if (group.length <= 1) continue;
      const keeper = group.find((r) => r.driverType !== "unassigned") ?? group[0];
      const toRemove = group.filter((r) => r.id !== keeper.id);

      plan.push({
        eventId: event.id,
        eventTitle: event.title,
        kind,
        keep: { id: keeper.id, driverType: keeper.driverType },
        remove: toRemove.map((r) => ({ id: r.id, driverType: r.driverType })),
      });

      if (!dryRun) {
        for (const loser of toRemove) {
          await notifyRideCancelled(loser);
          await db.delete(rides).where(eq(rides.id, loser.id));
        }
      }
    }
  }

  return NextResponse.json({ ok: true, dryRun, feed: feed.label, duplicateRideGroupsFound: plan.length, plan });
}
