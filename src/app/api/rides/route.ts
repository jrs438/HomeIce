import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rides } from "@/db/schema";
import { and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const conditions = [];
  if (start) conditions.push(gte(rides.date, start));
  if (end) conditions.push(lte(rides.date, end));

  const rows = await db.query.rides.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: (r, { asc }) => [asc(r.date), asc(r.time)],
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.date || !body.time || !body.kind || !body.from || !body.to) {
    return NextResponse.json({ error: "date, time, kind, from, to are required" }, { status: 400 });
  }
  const [created] = await db
    .insert(rides)
    .values({
      eventId: body.eventId || null,
      date: body.date,
      time: body.time,
      kind: body.kind,
      kidIds: body.kidIds ?? [],
      from: body.from,
      to: body.to,
      driverType: body.driverType ?? "unassigned",
      driverId: body.driverId || null,
      confirmed: !!body.confirmed,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
