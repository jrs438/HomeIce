import { db } from "@/db";
import { events, eventRules, eventExceptions } from "@/db/schema";
import { addDays, ymd, parseWallClockOrUtc, isOnRecurrenceCycle } from "@/lib/dates";
import { FAMILY_TIMEZONE } from "@/lib/family-constants";
import { and, eq, gte, lte } from "drizzle-orm";

export async function generateEventsForWeek(weekStart: Date) {
  const activeRules = await db.query.eventRules.findMany({ where: eq(eventRules.active, true) });

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dow = day.getDay();
    const date = ymd(day);
    const rulesForDay = activeRules.filter(
      (r) => r.dayOfWeek === dow && isOnRecurrenceCycle(day, r.intervalWeeks, r.anchorDate)
    );

    for (const rule of rulesForDay) {
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(`${date}T23:59:59.999`);
      const existing = await db.query.events.findFirst({
        where: and(
          eq(events.source, "recurring"),
          eq(events.sourceRef, rule.id),
          gte(events.start, dayStart),
          lte(events.start, dayEnd)
        ),
      });
      if (existing) continue;

      const exception = await db.query.eventExceptions.findFirst({
        where: and(eq(eventExceptions.eventRuleId, rule.id), eq(eventExceptions.date, date)),
      });
      if (exception) {
        skipped++;
        continue;
      }

      const start = parseWallClockOrUtc(`${date}T${rule.startTime}`, FAMILY_TIMEZONE);
      const end = rule.endTime ? parseWallClockOrUtc(`${date}T${rule.endTime}`, FAMILY_TIMEZONE) : null;

      await db.insert(events).values({
        title: rule.title,
        start,
        end,
        allDay: false,
        location: rule.location,
        kidIds: rule.kidIds,
        source: "recurring",
        sourceRef: rule.id,
        notes: rule.notes,
        status: "confirmed",
      });
      created++;
    }
  }

  return { created, skipped };
}
