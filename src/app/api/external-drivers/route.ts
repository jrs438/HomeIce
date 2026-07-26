import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { externalDrivers } from "@/db/schema";

export async function GET() {
  const all = await db.query.externalDrivers.findMany({ orderBy: (d, { asc }) => asc(d.name) });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const [created] = await db
    .insert(externalDrivers)
    .values({
      name: body.name,
      label: body.label || body.name,
      phone: body.phone || null,
      email: body.email || null,
      notes: body.notes || null,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
