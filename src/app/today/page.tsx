import { db } from "@/db";
import { events, dinnerMenu, rides } from "@/db/schema";
import { and, ne, or, isNull, gte, lte, eq } from "drizzle-orm";
import { parseWallClockOrUtc, utcToZonedParts, WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/dates";
import { FAMILY_TIMEZONE } from "@/lib/family-constants";
import { getHebcalInfo } from "@/lib/hebcal";
import { getSetting } from "@/lib/settings";
import { TodayClient } from "@/components/today/today-client";

export default async function TodayPage() {
  // The server's own local timezone is UTC (Vercel), not the family's — so
  // "today" has to be computed as the family's calendar date, not the
  // server's. Using the server's day directly would shift the whole
  // start/end window by UTC's offset from FAMILY_TIMEZONE, bleeding the
  // tail end of yesterday evening into "today" while cutting off today's
  // own late evening.
  const now = new Date();
  const today = utcToZonedParts(now, FAMILY_TIMEZONE).date;
  const dayStart = parseWallClockOrUtc(`${today}T00:00:00`, FAMILY_TIMEZONE);
  const dayEnd = parseWallClockOrUtc(`${today}T23:59:59.999`, FAMILY_TIMEZONE);

  const [todaysEvents, todaysRides, members, externalDrivers, dinner, zip] = await Promise.all([
    db.query.events.findMany({
      where: and(
        ne(events.status, "cancelled"),
        lte(events.start, dayEnd),
        or(gte(events.end, dayStart), and(isNull(events.end), gte(events.start, dayStart)))!
      ),
      orderBy: (e, { asc }) => asc(e.start),
    }),
    db.query.rides.findMany({
      where: eq(rides.date, today),
      orderBy: (r, { asc }) => asc(r.time),
    }),
    db.query.members.findMany(),
    db.query.externalDrivers.findMany(),
    db.query.dinnerMenu.findFirst({ where: eq(dinnerMenu.date, today) }),
    getSetting("candle_lighting_zip"),
  ]);

  const hebcal = await getHebcalInfo(zip);

  const todayDateOnly = new Date(`${today}T00:00:00`);
  const heading = `${WEEKDAY_LABELS[todayDateOnly.getDay()]}, ${MONTH_LABELS[todayDateOnly.getMonth()]} ${todayDateOnly.getDate()}`;

  return (
    <TodayClient
      heading={heading}
      hebrewDate={hebcal.hebrewDateToday}
      candleStrip={
        hebcal.isErevShabbatOrYomTov
          ? {
              candleLighting: hebcal.candleLighting,
              parasha: hebcal.parasha,
              yomTovToday: hebcal.yomTovToday,
            }
          : null
      }
      initialEvents={todaysEvents.map((e) => ({
        ...e,
        start: e.start.toISOString(),
        end: e.end ? e.end.toISOString() : null,
      }))}
      initialRides={todaysRides}
      members={members.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))}
      externalDrivers={externalDrivers}
      dinner={dinner ? { meal: dinner.meal, isYomTov: dinner.isYomTov } : null}
    />
  );
}
