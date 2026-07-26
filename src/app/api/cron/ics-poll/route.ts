import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, icsFeeds, rides } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireCronSecret } from "@/lib/require-cron";
import { parseIcs } from "@/lib/ics";
import { sendPushToMember } from "@/lib/push";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const feeds = await db.query.icsFeeds.findMany({ where: eq(icsFeeds.active, true) });
  let created = 0;
  let updated = 0;
  let flaggedRides = 0;
  const errors: string[] = [];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url);
      if (!res.ok) {
        errors.push(`${feed.label}: HTTP ${res.status}`);
        continue;
      }
      const text = await res.text();
      const parsed = parseIcs(text);

      for (const item of parsed) {
        const existing = await db.query.events.findFirst({ where: eq(events.icsUid, item.uid) });
        const title = feed.kind === "busy" ? `Busy: ${item.summary}` : item.summary;

        if (!existing) {
          if (item.cancelled) continue;
          await db.insert(events).values({
            title,
            start: item.start,
            end: item.end,
            allDay: item.allDay,
            location: item.location,
            kidIds: feed.kind === "busy" ? [] : feed.kidIds,
            source: "ics",
            sourceRef: feed.id,
            icsUid: item.uid,
            status: "confirmed",
            notes: item.description,
          });
          created++;
          continue;
        }

        if (item.cancelled) {
          await db.update(events).set({ status: "cancelled" }).where(eq(events.id, existing.id));
          updated++;
          continue;
        }

        const timeChanged =
          existing.start.getTime() !== item.start.getTime() ||
          (existing.end?.getTime() ?? null) !== (item.end?.getTime() ?? null);

        await db
          .update(events)
          .set({ title, start: item.start, end: item.end, location: item.location, updatedAt: new Date() })
          .where(eq(events.id, existing.id));
        updated++;

        if (timeChanged) {
          const affectedRides = await db.query.rides.findMany({ where: eq(rides.eventId, existing.id) });
          for (const ride of affectedRides) {
            await db.update(rides).set({ confirmed: false }).where(eq(rides.id, ride.id));
            flaggedRides++;
            if (ride.driverType === "member" && ride.driverId) {
              await sendPushToMember(ride.driverId, {
                title: "Ride time changed",
                body: `${title} moved — still OK to drive?`,
                url: "/rides",
              });
            }
          }
        }
      }

      await db.update(icsFeeds).set({ lastPolled: new Date() }).where(eq(icsFeeds.id, feed.id));
    } catch (err) {
      errors.push(`${feed.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, created, updated, flaggedRides, feedsPolled: feeds.length, errors });
}
