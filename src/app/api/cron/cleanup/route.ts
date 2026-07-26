import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { undoLog } from "@/db/schema";
import { lt } from "drizzle-orm";
import { requireCronSecret } from "@/lib/require-cron";
import { cleanupCheckedGroceryItems } from "@/lib/cleanup";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  await cleanupCheckedGroceryItems();
  await db.delete(undoLog).where(lt(undoLog.expiresAt, new Date()));

  return NextResponse.json({ ok: true });
}
