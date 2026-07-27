import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventExceptions, eventRules, events, rides, rideRules } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (!body.date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const existingException = await db.query.eventExceptions.findFirst({
    where: and(eq(eventExceptions.eventRuleId, id), eq(eventExceptions.date, body.date)),
  });
  const exception =
    existingException ??
    (await db.insert(eventExceptions).values({ eventRuleId: id, date: body.date }).returning())[0];

  // Cancel the materialized event for that date (if any) and clean up rides tied
  // to it — both a per-instance ride (eventId-linked) and any rule-cascade ride
  // (matched by kind/from/to, since those aren't linked to a specific event id).
  const dayStart = new Date(`${body.date}T00:00:00`);
  const dayEnd = new Date(`${body.date}T23:59:59.999`);
  const instance = await db.query.events.findFirst({
    where: and(eq(events.source, "recurring"), eq(events.sourceRef, id), gte(events.start, dayStart), lte(events.start, dayEnd)),
  });
  if (instance) {
    await db.delete(rides).where(eq(rides.eventId, instance.id));
    await db.update(events).set({ status: "cancelled" }).where(eq(events.id, instance.id));
  }

  const linkedRideRules = await db.query.rideRules.findMany({ where: eq(rideRules.eventRuleId, id) });
  for (const rr of linkedRideRules) {
    await db
      .delete(rides)
      .where(and(eq(rides.date, body.date), eq(rides.kind, rr.kind), eq(rides.from, rr.from), eq(rides.to, rr.to)));
  }

  return NextResponse.json(exception, { status: existingException ? 200 : 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rule = await db.query.eventRules.findFirst({ where: eq(eventRules.id, id) });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const all = await db.query.eventExceptions.findMany({ where: eq(eventExceptions.eventRuleId, id) });
  return NextResponse.json(all);
}
