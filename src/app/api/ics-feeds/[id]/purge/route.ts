import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, icsFeeds, rides } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notifyRideCancelled } from "@/lib/ride-notify";

// The genuine "start over" option: unlike a plain DELETE (which only stops
// future syncing and leaves everything already imported in place), this
// notifies drivers on any linked ride, then hard-deletes every event this
// feed ever imported — confirmed and cancelled alike — before removing the
// feed itself. rides.eventId cascades on delete, so removing the events
// takes their rides with them; the notify pass has to happen first since
// there's no ride left to notify about afterward.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const feedEvents = await db.query.events.findMany({
    where: and(eq(events.source, "ics"), eq(events.sourceRef, id)),
  });

  let ridesNotified = 0;
  for (const event of feedEvents) {
    const linkedRides = await db.query.rides.findMany({ where: eq(rides.eventId, event.id) });
    for (const ride of linkedRides) {
      await notifyRideCancelled(ride);
      ridesNotified++;
    }
  }

  if (feedEvents.length) {
    await db.delete(events).where(and(eq(events.source, "ics"), eq(events.sourceRef, id)));
  }
  await db.delete(icsFeeds).where(eq(icsFeeds.id, id));

  return NextResponse.json({ ok: true, eventsDeleted: feedEvents.length, ridesNotified });
}
