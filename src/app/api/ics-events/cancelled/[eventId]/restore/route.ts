import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, icsFeeds } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createRidesForEvent } from "@/lib/ics-poll";

// Restores a cancelled ICS-sourced event regardless of why it was
// cancelled, and regardless of whether the feed it came from still exists
// (deleting and re-adding a feed orphans its old events' sourceRef). If the
// feed is still around, also recreates any ride it currently calls for; if
// not, we can't know what ride settings would apply, so just the event
// itself comes back.
export async function POST(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const event = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.source, "ics")),
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.status !== "cancelled") return NextResponse.json({ error: "Event isn't cancelled" }, { status: 400 });

  const feed = event.sourceRef ? await db.query.icsFeeds.findFirst({ where: eq(icsFeeds.id, event.sourceRef) }) : null;

  const [restored] = await db
    .update(events)
    .set({ status: "confirmed", filteredOut: false, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  const ridesCreated =
    feed && event.icsUid
      ? await createRidesForEvent(feed, event.id, {
          uid: event.icsUid,
          summary: event.title,
          location: event.location,
          description: event.notes,
          start: event.start,
          end: event.end,
          allDay: event.allDay,
          cancelled: false,
        })
      : 0;

  return NextResponse.json({ event: restored, ridesCreated, feedStillExists: !!feed });
}
