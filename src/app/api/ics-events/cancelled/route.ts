import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

// Lists cancelled ICS-sourced events across ALL feeds — not scoped to one
// feed's current row, since deleting and re-adding a feed (even with the
// exact same URL) gives it a brand new id, orphaning any events tagged
// with the old one. Those orphaned events are still real data and still
// worth being able to find and restore, so this looks them up by source
// type alone and separately resolves each one's feed label (falling back
// to "no longer configured" if that feed row is gone).
export async function GET() {
  const cancelled = await db.query.events.findMany({
    where: and(eq(events.source, "ics"), eq(events.status, "cancelled")),
    orderBy: desc(events.start),
    limit: 100,
  });

  const feedIds = Array.from(new Set(cancelled.map((e) => e.sourceRef).filter((id): id is string => !!id)));
  const feeds = feedIds.length ? await db.query.icsFeeds.findMany({ where: (f, { inArray }) => inArray(f.id, feedIds) }) : [];
  const feedLabelById = new Map(feeds.map((f) => [f.id, f.label]));

  return NextResponse.json(
    cancelled.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      location: e.location,
      feedId: e.sourceRef,
      feedLabel: (e.sourceRef && feedLabelById.get(e.sourceRef)) ?? null,
    }))
  );
}
