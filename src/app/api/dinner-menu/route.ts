import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dinnerMenu } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const conditions = [];
  if (start) conditions.push(gte(dinnerMenu.date, start));
  if (end) conditions.push(lte(dinnerMenu.date, end));

  const rows = await db.query.dinnerMenu.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: (d, { asc }) => asc(d.date),
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.date || !body.meal) {
    return NextResponse.json({ error: "date and meal are required" }, { status: 400 });
  }

  const existing = await db.query.dinnerMenu.findFirst({ where: eq(dinnerMenu.date, body.date) });
  if (existing) {
    const [updated] = await db
      .update(dinnerMenu)
      .set({ meal: body.meal, requestedBy: body.requestedBy || null })
      .where(eq(dinnerMenu.id, existing.id))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(dinnerMenu)
    .values({
      date: body.date,
      meal: body.meal,
      requestedBy: body.requestedBy || null,
      isYomTov: body.isYomTov ?? false,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
