import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { icsFeeds } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Partial<typeof icsFeeds.$inferInsert> = {};
  if (body.url !== undefined) patch.url = body.url;
  if (body.label !== undefined) patch.label = body.label;
  if (body.kidIds !== undefined) patch.kidIds = body.kidIds;
  if (body.kind !== undefined) patch.kind = body.kind;
  if (body.needsDropoff !== undefined) patch.needsDropoff = !!body.needsDropoff;
  if (body.needsPickup !== undefined) patch.needsPickup = !!body.needsPickup;
  if (body.skipKeywords !== undefined) patch.skipKeywords = body.skipKeywords;
  if (body.onlyKeywords !== undefined) patch.onlyKeywords = body.onlyKeywords;
  if (body.active !== undefined) patch.active = body.active;

  const [updated] = await db.update(icsFeeds).set(patch).where(eq(icsFeeds.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(icsFeeds).where(eq(icsFeeds.id, id));
  return NextResponse.json({ ok: true });
}
