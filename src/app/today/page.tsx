import { db } from "@/db";
import { events, dinnerMenu } from "@/db/schema";
import { and, ne, or, isNull, gte, lte, eq } from "drizzle-orm";
import { startOfDay, endOfDay, ymd, WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/dates";
import { TodayClient } from "@/components/today/today-client";

export default async function TodayPage() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const [todaysEvents, members, dinner] = await Promise.all([
    db.query.events.findMany({
      where: and(
        ne(events.status, "cancelled"),
        or(isNull(events.end), gte(events.end, dayStart))!,
        lte(events.start, dayEnd)
      ),
      orderBy: (e, { asc }) => asc(e.start),
    }),
    db.query.members.findMany(),
    db.query.dinnerMenu.findFirst({ where: eq(dinnerMenu.date, ymd(now)) }),
  ]);

  const heading = `${WEEKDAY_LABELS[now.getDay()]}, ${MONTH_LABELS[now.getMonth()]} ${now.getDate()}`;

  return (
    <TodayClient
      heading={heading}
      initialEvents={todaysEvents.map((e) => ({
        ...e,
        start: e.start.toISOString(),
        end: e.end ? e.end.toISOString() : null,
      }))}
      members={members.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))}
      dinner={dinner ? { meal: dinner.meal, isYomTov: dinner.isYomTov } : null}
    />
  );
}
