import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "@/db";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
