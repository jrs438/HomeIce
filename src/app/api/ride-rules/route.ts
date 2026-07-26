import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rideRules } from "@/db/schema";

export async function GET() {
  const all = await db.query.rideRules.findMany({
    orderBy: (r, { asc }) => [asc(r.dayOfWeek), asc(r.time)],
  });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.label || body.dayOfWeek === undefined || !body.kind || !body.from || !body.to) {
    return NextResponse.json(
      { error: "label, dayOfWeek, kind, from, to are required" },
      { status: 400 }
    );
  }
  const [created] = await db
    .insert(rideRules)
    .values({
      label: body.label,
      dayOfWeek: body.dayOfWeek,
      kind: body.kind,
      kidIds: body.kidIds ?? [],
      from: body.from,
      to: body.to,
      time: body.time || null,
      driverType: body.driverType ?? "unassigned",
      driverId: body.driverId || null,
      active: body.active ?? true,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
