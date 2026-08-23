import { db } from "@/db";
import { rides, rideRules, eventExceptions, eventRules } from "@/db/schema";
import { addDays, ymd, isOnRecurrenceCycle } from "@/lib/dates";
import { and, eq, inArray } from "drizzle-orm";
import { notifyRideDriverChange } from "@/lib/ride-notify";

export async function generateRidesForWeek(weekStart: Date) {
  const activeRules = await db.query.rideRules.findMany({ where: eq(rideRules.active, true) });

  // A ride rule tied to a recurring event (eventRuleId) should stop once
  // that event's own end date passes — otherwise you'd get ride placeholders
  // for an activity that's no longer happening.
  const linkedEventRuleIds = Array.from(new Set(activeRules.map((r) => r.eventRuleId).filter((id): id is string => !!id)));
  const linkedEventRules = linkedEventRuleIds.length
    ? await db.query.eventRules.findMany({ where: inArray(eventRules.id, linkedEventRuleIds) })
    : [];
  const endDateByEventRuleId = new Map(linkedEventRules.map((er) => [er.id, er.endDate]));

  let created = 0;
  let skippedNoTime = 0;
  let skippedException = 0;

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dow = day.getDay();
    const date = ymd(day);
    const rulesForDay = activeRules.filter((r) => {
      if (r.dayOfWeek !== dow || !isOnRecurrenceCycle(day, r.intervalWeeks, r.anchorDate)) return false;
      const linkedEndDate = r.eventRuleId ? endDateByEventRuleId.get(r.eventRuleId) : null;
      return !linkedEndDate || date <= linkedEndDate;
    });

    for (const rule of rulesForDay) {
      if (!rule.time) {
        skippedNoTime++;
        continue;
      }

      if (rule.eventRuleId) {
        const exception = await db.query.eventExceptions.findFirst({
          where: and(eq(eventExceptions.eventRuleId, rule.eventRuleId), eq(eventExceptions.date, date)),
        });
        if (exception) {
          skippedException++;
          continue;
        }
      }

      const existing = await db.query.rides.findFirst({
        where: and(eq(rides.date, date), eq(rides.kind, rule.kind), eq(rides.from, rule.from), eq(rides.to, rule.to)),
      });
      if (existing) continue;

      const [inserted] = await db
        .insert(rides)
        .values({
          date,
          time: rule.time,
          kind: rule.kind,
          kidIds: rule.kidIds,
          from: rule.from,
          to: rule.to,
          driverType: rule.driverType,
          driverId: rule.driverId,
          confirmed: false,
        })
        .returning();
      if (rule.driverType !== "unassigned") {
        await notifyRideDriverChange(inserted, null, { driverType: rule.driverType, driverId: rule.driverId });
      }
      created++;
    }
  }

  return { created, skippedNoTime, skippedException };
}
