import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { requireCronSecret } from "@/lib/require-cron";
import { sendPushToRoles, pushConfigured } from "@/lib/push";
import { events, rides } from "@/db/schema";
import { and, ne, or, isNull, gte, lte, eq } from "drizzle-orm";
import { parseWallClockOrUtc, utcToZonedParts } from "@/lib/dates";
import { FAMILY_TIMEZONE } from "@/lib/family-constants";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  if (!pushConfigured()) {
    return NextResponse.json({ ok: true, sent: false, note: "Push not configured (VAPID keys missing)" });
  }

  // Same family-timezone-vs-server-UTC distinction as the Today page: "today"
  // has to be the family's calendar date, not the server's.
  const today = utcToZonedParts(new Date(), FAMILY_TIMEZONE).date;
  const dayStart = parseWallClockOrUtc(`${today}T00:00:00`, FAMILY_TIMEZONE);
  const dayEnd = parseWallClockOrUtc(`${today}T23:59:59.999`, FAMILY_TIMEZONE);

  const [todaysEvents, todaysRides] = await Promise.all([
    db.query.events.findMany({
      where: and(
        ne(events.status, "cancelled"),
        lte(events.start, dayEnd),
        or(gte(events.end, dayStart), and(isNull(events.end), gte(events.start, dayStart)))!
      ),
    }),
    db.query.rides.findMany({ where: eq(rides.date, today) }),
  ]);

  const unassigned = todaysRides.filter((r) => r.driverType === "unassigned").length;
  const body =
    todaysEvents.length === 0 && todaysRides.length === 0
      ? "Nothing on the calendar today."
      : `${todaysEvents.length} event(s), ${todaysRides.length} ride(s)${unassigned ? `, ${unassigned} unassigned` : ""}.`;

  await sendPushToRoles(["parent", "sitter"], { title: "HomeIce — today", body, url: "/today" });

  return NextResponse.json({ ok: true, sent: true, body });
}
