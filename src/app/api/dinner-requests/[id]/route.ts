import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dinnerRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.query.dinnerRequests.findFirst({ where: eq(dinnerRequests.id, id) });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Partial<typeof dinnerRequests.$inferInsert> = {};
  if (body.text !== undefined) patch.text = body.text;
  if (body.toggleVoteMemberId) {
    const voterId: string = body.toggleVoteMemberId;
    patch.votes = existing.votes.includes(voterId)
      ? existing.votes.filter((v) => v !== voterId)
      : [...existing.votes, voterId];
  }

  const [updated] = await db.update(dinnerRequests).set(patch).where(eq(dinnerRequests.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(dinnerRequests).where(eq(dinnerRequests.id, id));
  return NextResponse.json({ ok: true });
}
