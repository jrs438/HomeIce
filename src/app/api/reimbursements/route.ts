import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reimbursements } from "@/db/schema";

export async function GET() {
  const all = await db.query.reimbursements.findMany({
    orderBy: (r, { desc }) => desc(r.date),
  });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.date || body.amount === undefined) {
    return NextResponse.json({ error: "date and amount are required" }, { status: 400 });
  }
  const [created] = await db
    .insert(reimbursements)
    .values({
      memberId: body.memberId || null,
      date: body.date,
      amount: String(body.amount),
      store: body.store || null,
      notes: body.notes || null,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
