import { db } from "@/db";
import { events, dinnerMenu, rides } from "@/db/schema";
import { and, ne, or, isNull, gte, lte, eq } from "drizzle-orm";
import { startOfDay, endOfDay, ymd, WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/dates";
import { getHebcalInfo } from "@/lib/hebcal";
import { getSetting } from "@/lib/settings";
import { TodayClient } from "@/components/today/today-client";

export default async function TodayPage() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const today = ymd(now);

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

  const heading = `${WEEKDAY_LABELS[now.getDay()]}, ${MONTH_LABELS[now.getMonth()]} ${now.getDate()}`;

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
