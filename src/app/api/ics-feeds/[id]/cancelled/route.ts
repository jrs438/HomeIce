import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

// Lists cancelled events sourced from this feed regardless of *why* they
// were cancelled (a filter, the source calendar itself, or by hand) — the
// manual escape hatch for anything the automatic filter-restore can't
// safely infer on its own (e.g. it was cancelled before that tracking
// existed, or a family member cancelled it directly).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cancelled = await db.query.events.findMany({
    where: and(eq(events.source, "ics"), eq(events.sourceRef, id), eq(events.status, "cancelled")),
    orderBy: desc(events.start),
    limit: 50,
  });
  return NextResponse.json(cancelled);
}
