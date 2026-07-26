import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { requireCronSecret } from "@/lib/require-cron";
import { sendPushToRoles, pushConfigured } from "@/lib/push";
import { events, rides } from "@/db/schema";
import { and, ne, or, isNull, gte, lte, eq } from "drizzle-orm";
import { startOfDay, endOfDay, ymd } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  if (!pushConfigured()) {
    return NextResponse.json({ ok: true, sent: false, note: "Push not configured (VAPID keys missing)" });
  }

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const today = ymd(now);

  const [todaysEvents, todaysRides] = await Promise.all([
    db.query.events.findMany({
      where: and(ne(events.status, "cancelled"), or(isNull(events.end), gte(events.end, dayStart))!, lte(events.start, dayEnd)),
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
