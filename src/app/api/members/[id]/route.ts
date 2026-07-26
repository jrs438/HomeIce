import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/require-admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;

  const body = await req.json();
  const patch: Partial<typeof members.$inferInsert> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.role !== undefined) patch.role = body.role;
  if (body.color !== undefined) patch.color = body.color;
  if (body.isAdmin !== undefined) patch.isAdmin = body.isAdmin;
  if (body.emails !== undefined) patch.emails = body.emails;
  if (body.inviteEmail !== undefined) patch.inviteEmail = body.inviteEmail || null;

  const [updated] = await db.update(members).set(patch).where(eq(members.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  await db.delete(members).where(eq(members.id, id));
  return NextResponse.json({ ok: true });
}
