import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nextWeekKey } from "@/lib/week";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.fromWeek) {
    return NextResponse.json({ error: "fromWeek is required" }, { status: 400 });
  }
  const toWeek = nextWeekKey(body.fromWeek);

  const existingNext = await db.query.chores.findMany({ where: eq(chores.week, toWeek) });
  if (existingNext.length > 0) {
    return NextResponse.json({ ok: true, week: toWeek, created: 0, note: "already rolled over" });
  }

  const current = await db.query.chores.findMany({ where: eq(chores.week, body.fromWeek) });
  if (current.length === 0) {
    return NextResponse.json({ ok: true, week: toWeek, created: 0 });
  }

  const inserted = await db
    .insert(chores)
    .values(
      current.map((c) => ({
        memberId: c.memberId,
        title: c.title,
        cadence: c.cadence,
        week: toWeek,
        points: c.points,
        done: false,
      }))
    )
    .returning();

  return NextResponse.json({ ok: true, week: toWeek, created: inserted.length });
}
