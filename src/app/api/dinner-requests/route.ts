import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dinnerRequests } from "@/db/schema";

export async function GET() {
  const all = await db.query.dinnerRequests.findMany({ orderBy: (d, { asc }) => asc(d.createdAt) });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.text) return NextResponse.json({ error: "text is required" }, { status: 400 });
  const [created] = await db
    .insert(dinnerRequests)
    .values({ memberId: body.memberId || null, text: body.text, votes: [] })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
