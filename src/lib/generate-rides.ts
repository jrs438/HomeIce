import { db } from "@/db";
import { rides, rideRules } from "@/db/schema";
import { addDays, ymd } from "@/lib/dates";
import { and, eq } from "drizzle-orm";

export async function generateRidesForWeek(weekStart: Date) {
  const activeRules = await db.query.rideRules.findMany({ where: eq(rideRules.active, true) });

  let created = 0;
  let skippedNoTime = 0;

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dow = day.getDay();
    const date = ymd(day);
    const rulesForDay = activeRules.filter((r) => r.dayOfWeek === dow);

    for (const rule of rulesForDay) {
      if (!rule.time) {
        skippedNoTime++;
        continue;
      }

      const existing = await db.query.rides.findFirst({
        where: and(eq(rides.date, date), eq(rides.kind, rule.kind), eq(rides.from, rule.from), eq(rides.to, rule.to)),
      });
      if (existing) continue;

      await db.insert(rides).values({
        date,
        time: rule.time,
        kind: rule.kind,
        kidIds: rule.kidIds,
        from: rule.from,
        to: rule.to,
        driverType: rule.driverType,
        driverId: rule.driverId,
        confirmed: false,
      });
      created++;
    }
  }

  return { created, skippedNoTime };
}
