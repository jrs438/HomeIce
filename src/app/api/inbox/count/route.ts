import { NextResponse } from "next/server";
import { db } from "@/db";
import { inboxItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inboxItems)
    .where(eq(inboxItems.status, "pending"));
  return NextResponse.json({ count });
}
