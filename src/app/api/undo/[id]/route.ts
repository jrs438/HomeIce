import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { undoLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { applyUndo } from "@/lib/capture/apply";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db.query.undoLog.findFirst({ where: eq(undoLog.id, id) });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.applied) return NextResponse.json({ error: "Already undone" }, { status: 400 });
  if (row.expiresAt < new Date()) return NextResponse.json({ error: "Undo window expired" }, { status: 400 });

  await applyUndo(row.inverseAction as Record<string, unknown>);
  await db.update(undoLog).set({ applied: true }).where(eq(undoLog.id, id));
  return NextResponse.json({ ok: true });
}
