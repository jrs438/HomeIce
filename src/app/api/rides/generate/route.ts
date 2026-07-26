import { NextRequest, NextResponse } from "next/server";
import { generateRidesForWeek } from "@/lib/generate-rides";
import { startOfWeek } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const weekStart = body.weekStart ? startOfWeek(new Date(body.weekStart)) : startOfWeek(new Date());
  const result = await generateRidesForWeek(weekStart);
  return NextResponse.json({ ok: true, ...result });
}
