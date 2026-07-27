import { NextRequest, NextResponse } from "next/server";
import { generateEventsForWeek } from "@/lib/generate-events";
import { startOfWeek } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const weekStart = body.weekStart ? startOfWeek(new Date(body.weekStart)) : startOfWeek(new Date());
  const result = await generateEventsForWeek(weekStart);
  return NextResponse.json({ ok: true, ...result });
}
