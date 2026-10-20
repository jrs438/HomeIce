import { db } from "@/db";
import { events, rides } from "@/db/schema";
import { and, ne, or, isNull, gte, lte } from "drizzle-orm";
import { parseWallClockOrUtc, utcToZonedParts, addDays, ymd } from "@/lib/dates";
import { FAMILY_TIMEZONE } from "@/lib/family-constants";
import { PrintClient } from "@/components/print/print-client";

export default async function PrintPage() {
  // Same family-timezone handling as the Today page: "today" has to be the
  // family's own calendar date, not the server's UTC one.
  const now = new Date();
  const today = utcToZonedParts(now, FAMILY_TIMEZONE).date;
  const todayDateOnly = new Date(`${today}T00:00:00`);
  const weekEnd = ymd(addDays(todayDateOnly, 6));

  const rangeStart = parseWallClockOrUtc(`${today}T00:00:00`, FAMILY_TIMEZONE);
  const rangeEnd = parseWallClockOrUtc(`${weekEnd}T23:59:59.999`, FAMILY_TIMEZONE);

  const [weekEvents, weekRides, members, externalDrivers] = await Promise.all([
    db.query.events.findMany({
      where: and(
        ne(events.status, "cancelled"),
        lte(events.start, rangeEnd),
        or(gte(events.end, rangeStart), and(isNull(events.end), gte(events.start, rangeStart)))!
      ),
      orderBy: (e, { asc }) => asc(e.start),
    }),
    db.query.rides.findMany({
      where: and(gte(rides.date, today), lte(rides.date, weekEnd)),
      orderBy: (r, { asc }) => asc(r.time),
    }),
    db.query.members.findMany(),
    db.query.externalDrivers.findMany(),
  ]);

  return (
    <PrintClient
      todayDate={today}
      initialEvents={weekEvents.map((e) => ({
        ...e,
        start: e.start.toISOString(),
        end: e.end ? e.end.toISOString() : null,
      }))}
      initialRides={weekRides}
      members={members.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))}
      externalDrivers={externalDrivers}
    />
  );
}
