import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chores } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week");
  const all = await db.query.chores.findMany({
    where: week ? eq(chores.week, week) : undefined,
    orderBy: (c, { asc }) => asc(c.createdAt),
  });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title || !body.week) {
    return NextResponse.json({ error: "title and week are required" }, { status: 400 });
  }
  const [created] = await db
    .insert(chores)
    .values({
      memberId: body.memberId || null,
      title: body.title,
      cadence: body.cadence || "weekly",
      week: body.week,
      points: body.points ?? 0,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
