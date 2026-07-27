import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/require-cron";
import { generateEventsForWeek } from "@/lib/generate-events";
import { generateRidesForWeek } from "@/lib/generate-rides";
import { addDays, startOfWeek } from "@/lib/dates";

const WEEKS_AHEAD = 3;

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const weekStart = startOfWeek(new Date());
  let eventsCreated = 0;
  let ridesCreated = 0;

  for (let w = 0; w < WEEKS_AHEAD; w++) {
    const start = addDays(weekStart, w * 7);
    const eventResult = await generateEventsForWeek(start);
    const rideResult = await generateRidesForWeek(start);
    eventsCreated += eventResult.created;
    ridesCreated += rideResult.created;
  }

  return NextResponse.json({ ok: true, eventsCreated, ridesCreated });
}
