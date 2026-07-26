import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { and, gte, lte, ne, or, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const conditions = [ne(events.status, "cancelled")];
  if (start) conditions.push(or(isNull(events.end), gte(events.end, new Date(start)))!);
  if (end) conditions.push(lte(events.start, new Date(end)));

  const rows = await db.query.events.findMany({
    where: and(...conditions),
    orderBy: (e, { asc }) => asc(e.start),
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title || !body.start) {
    return NextResponse.json({ error: "title and start are required" }, { status: 400 });
  }
  const [created] = await db
    .insert(events)
    .values({
      title: body.title,
      start: new Date(body.start),
      end: body.end ? new Date(body.end) : null,
      allDay: !!body.allDay,
      location: body.location || null,
      kidIds: body.kidIds ?? [],
      source: body.source ?? "manual",
      sourceRef: body.sourceRef || null,
      status: body.status ?? "confirmed",
      notes: body.notes || null,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
