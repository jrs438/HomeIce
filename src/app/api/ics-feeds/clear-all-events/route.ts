import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, rides } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifyRideCancelled } from "@/lib/ride-notify";

// The true reset: deletes every ICS-sourced event regardless of which feed
// (existing or long since deleted) it's tagged to — unlike per-feed purge,
// which can only reach events tied to that feed's *current* row id. Handles
// the case where a feed's been deleted and re-added multiple times, leaving
// several generations of orphaned events behind that per-feed purge can't
// see. Feed subscriptions themselves are left in place so they can sync in
// fresh right after.
export async function POST() {
  const allIcsEvents = await db.query.events.findMany({ where: eq(events.source, "ics") });

  let ridesNotified = 0;
  for (const event of allIcsEvents) {
    const linkedRides = await db.query.rides.findMany({ where: eq(rides.eventId, event.id) });
    for (const ride of linkedRides) {
      await notifyRideCancelled(ride);
      ridesNotified++;
    }
  }

  if (allIcsEvents.length) {
    await db.delete(events).where(eq(events.source, "ics"));
  }

  return NextResponse.json({ ok: true, eventsDeleted: allIcsEvents.length, ridesNotified });
}
