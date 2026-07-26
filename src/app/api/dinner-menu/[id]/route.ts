import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dinnerMenu } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof dinnerMenu.$inferInsert> = {};
  if (body.meal !== undefined) patch.meal = body.meal;
  if (body.requestedBy !== undefined) patch.requestedBy = body.requestedBy || null;
  if (body.isYomTov !== undefined) patch.isYomTov = body.isYomTov;

  const [updated] = await db.update(dinnerMenu).set(patch).where(eq(dinnerMenu.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(dinnerMenu).where(eq(dinnerMenu.id, id));
  return NextResponse.json({ ok: true });
}
