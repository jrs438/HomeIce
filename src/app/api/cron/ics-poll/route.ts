import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/require-cron";
import { pollIcsFeeds } from "@/lib/ics-poll";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const result = await pollIcsFeeds();
  return NextResponse.json(result);
}
