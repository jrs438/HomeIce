import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groceryItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const patch: Partial<typeof groceryItems.$inferInsert> = {};
  if (body.item !== undefined) patch.item = body.item;
  if (body.store !== undefined) patch.store = body.store;
  if (body.done !== undefined) {
    patch.done = body.done;
    patch.doneAt = body.done ? new Date() : null;
  }

  const [updated] = await db.update(groceryItems).set(patch).where(eq(groceryItems.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(groceryItems).where(eq(groceryItems.id, id));
  return NextResponse.json({ ok: true });
}
