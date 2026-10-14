import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { icsFeeds, events } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { parseIcs } from "@/lib/ics";

/**
 * Read-only diagnostic: fetches a configured ICS feed live right now and
 * returns what the feed currently says alongside what's already stored for
 * it, so a UID- or start-time-instability issue (an upstream feed that
 * reissues a new UID or shifts a placeholder time for what's really the
 * same game) can be seen directly instead of guessed at.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const label = req.nextUrl.searchParams.get("label");
  if (!label) return NextResponse.json({ error: "label query param is required" }, { status: 400 });

  const feed = await db.query.icsFeeds.findFirst({ where: ilike(icsFeeds.label, `%${label}%`) });
  if (!feed) return NextResponse.json({ error: "No feed matching that label" }, { status: 404 });

  const res = await fetch(feed.url);
  if (!res.ok) return NextResponse.json({ error: `Feed fetch failed: HTTP ${res.status}` }, { status: 502 });
  const text = await res.text();
  const parsed = parseIcs(text);

  const existingEvents = await db.query.events.findMany({
    where: and(eq(events.source, "ics"), eq(events.sourceRef, feed.id)),
    orderBy: (e, { asc }) => asc(e.start),
  });

  return NextResponse.json({
    feed: { id: feed.id, label: feed.label, url: feed.url, kind: feed.kind },
    parsedFromFeedNow: parsed.map((p) => ({
      uid: p.uid,
      summary: p.summary,
      location: p.location,
      start: p.start,
      end: p.end,
      cancelled: p.cancelled,
    })),
    existingInDb: existingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      icsUid: e.icsUid,
      start: e.start,
      end: e.end,
      status: e.status,
      location: e.location,
    })),
  });
}
