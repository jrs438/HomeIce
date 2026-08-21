import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, icsFeeds } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createRidesForEvent } from "@/lib/ics-poll";

// Manual restore for a cancelled ICS-sourced event, regardless of why it was
// cancelled — the escape hatch for events cancelled before filter-cause
// tracking existed, or cancelled by hand and now wanted back after all.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  const { id, eventId } = await params;

  const [feed, event] = await Promise.all([
    db.query.icsFeeds.findFirst({ where: eq(icsFeeds.id, id) }),
    db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.source, "ics"), eq(events.sourceRef, id)),
    }),
  ]);
  if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  if (!event) return NextResponse.json({ error: "Event not found on this feed" }, { status: 404 });
  if (event.status !== "cancelled") return NextResponse.json({ error: "Event isn't cancelled" }, { status: 400 });

  const [restored] = await db
    .update(events)
    .set({ status: "confirmed", filteredOut: false, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  const ridesCreated = event.icsUid
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

  return NextResponse.json({ event: restored, ridesCreated });
}
