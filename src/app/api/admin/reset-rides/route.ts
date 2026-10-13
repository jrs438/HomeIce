import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rides } from "@/db/schema";
import { and, gte, ilike, or } from "drizzle-orm";
import { notifyRideCancelled } from "@/lib/ride-notify";
import { startOfWeek, addDays, utcToZonedParts } from "@/lib/dates";
import { FAMILY_TIMEZONE } from "@/lib/family-constants";
import { generateRidesForWeek } from "@/lib/generate-rides";

export const maxDuration = 60;

const WEEKS_AHEAD = 40; // comfortably covers through a school year's end date

/**
 * One-time cleanup for a location whose ride rules got duplicated (e.g. a
 * standalone rule created alongside a recurring-event-linked one, at a
 * slightly different time) and left a mess of stray already-materialized
 * rides across many future weeks. Rather than hunting each wrong row down by
 * hand, this wipes every not-yet-happened ride touching that location and
 * regenerates fresh, strictly from whatever ride rules are active right now
 * — so it only works correctly once the duplicate *rules* have already been
 * cleaned up in Rides -> Defaults; otherwise it just regenerates the same mess.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const location: string | undefined = body.location;
  if (!location) {
    return NextResponse.json({ error: "location is required" }, { status: 400 });
  }

  const today = utcToZonedParts(new Date(), FAMILY_TIMEZONE).date;
  const locationFilter = or(ilike(rides.from, `%${location}%`), ilike(rides.to, `%${location}%`))!;

  const matching = await db.query.rides.findMany({
    where: and(gte(rides.date, today), locationFilter),
  });
  for (const r of matching) await notifyRideCancelled(r);
  if (matching.length) {
    await db.delete(rides).where(and(gte(rides.date, today), locationFilter));
  }

  const weekStart = startOfWeek(new Date());
  let created = 0;
  for (let w = 0; w < WEEKS_AHEAD; w++) {
    const result = await generateRidesForWeek(addDays(weekStart, w * 7));
    created += result.created;
  }

  return NextResponse.json({ ok: true, deleted: matching.length, created });
}
