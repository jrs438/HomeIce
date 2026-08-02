import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reimbursements } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof reimbursements.$inferInsert> = { updatedAt: new Date() };
  if (body.memberId !== undefined) patch.memberId = body.memberId || null;
  if (body.date !== undefined) patch.date = body.date;
  if (body.amount !== undefined) patch.amount = String(body.amount);
  if (body.store !== undefined) patch.store = body.store || null;
  if (body.notes !== undefined) patch.notes = body.notes || null;
  if (body.reimbursed !== undefined) patch.reimbursed = body.reimbursed;

  const [updated] = await db.update(reimbursements).set(patch).where(eq(reimbursements.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(reimbursements).where(eq(reimbursements.id, id));
  return NextResponse.json({ ok: true });
}
