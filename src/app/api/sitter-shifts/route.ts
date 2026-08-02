import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sitterShifts } from "@/db/schema";

export async function GET() {
  const all = await db.query.sitterShifts.findMany({
    orderBy: (s, { desc }) => desc(s.date),
  });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.date || body.hours === undefined) {
    return NextResponse.json({ error: "date and hours are required" }, { status: 400 });
  }
  const [created] = await db
    .insert(sitterShifts)
    .values({
      sitterId: body.sitterId || null,
      date: body.date,
      hours: String(body.hours),
      rate: body.rate !== undefined && body.rate !== null && body.rate !== "" ? String(body.rate) : null,
      notes: body.notes || null,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
