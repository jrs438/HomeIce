import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventRules, rideRules } from "@/db/schema";
import { startOfWeek } from "@/lib/dates";
import { generateEventsForWeek } from "@/lib/generate-events";
import { generateRidesForWeek } from "@/lib/generate-rides";

const WEEKS_AHEAD = 4;

export async function GET() {
  const all = await db.query.eventRules.findMany({
    orderBy: (r, { asc }) => [asc(r.dayOfWeek), asc(r.startTime)],
  });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title || body.dayOfWeek === undefined || !body.anchorDate || !body.startTime) {
    return NextResponse.json(
      { error: "title, dayOfWeek, anchorDate, startTime are required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(eventRules)
    .values({
      title: body.title,
      dayOfWeek: body.dayOfWeek,
      intervalWeeks: body.intervalWeeks ?? 1,
      anchorDate: body.anchorDate,
      startTime: body.startTime,
      endTime: body.endTime || null,
      location: body.location || null,
      kidIds: body.kidIds ?? [],
      notes: body.notes || null,
      active: body.active ?? true,
    })
    .returning();

  if (body.needsDropoff && body.dropoffFrom && body.dropoffTo) {
    await db.insert(rideRules).values({
      label: `${created.title} drop-off`,
      dayOfWeek: created.dayOfWeek,
      intervalWeeks: created.intervalWeeks,
      anchorDate: created.anchorDate,
      kind: "activity_dropoff",
      kidIds: created.kidIds,
      from: body.dropoffFrom,
      to: body.dropoffTo,
      time: body.startTime,
      eventRuleId: created.id,
    });
  }
  if (body.needsPickup && body.pickupFrom && body.pickupTo) {
    await db.insert(rideRules).values({
      label: `${created.title} pick-up`,
      dayOfWeek: created.dayOfWeek,
      intervalWeeks: created.intervalWeeks,
      anchorDate: created.anchorDate,
      kind: "activity_pickup",
      kidIds: created.kidIds,
      from: body.pickupFrom,
      to: body.pickupTo,
      time: body.endTime || body.startTime,
      eventRuleId: created.id,
    });
  }

  const weekStart = startOfWeek(new Date());
  for (let w = 0; w < WEEKS_AHEAD; w++) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + w * 7);
    await generateEventsForWeek(start);
    await generateRidesForWeek(start);
  }

  return NextResponse.json(created, { status: 201 });
}
