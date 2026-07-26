import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { icsFeeds } from "@/db/schema";

export async function GET() {
  const all = await db.query.icsFeeds.findMany({ orderBy: (f, { asc }) => asc(f.label) });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.url || !body.label) {
    return NextResponse.json({ error: "url and label are required" }, { status: 400 });
  }
  const [created] = await db
    .insert(icsFeeds)
    .values({
      url: body.url,
      label: body.label,
      kidIds: body.kidIds ?? [],
      kind: body.kind ?? "events",
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
