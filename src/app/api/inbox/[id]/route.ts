import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inboxItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { approveInboxItem } from "@/lib/capture/run";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (body.action === "approve") {
    const outcomes = await approveInboxItem(id);
    if (!outcomes) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, outcomes });
  }

  if (body.action === "dismiss") {
    await db.update(inboxItems).set({ status: "dismissed" }).where(eq(inboxItems.id, id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
