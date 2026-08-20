import { NextResponse } from "next/server";
import { pollIcsFeeds } from "@/lib/ics-poll";

// Manual "sync now" for the Settings page — same logic as the cron poll, but
// gated by the normal session (via proxy.ts) instead of CRON_SECRET, so a
// family member can immediately apply a new skip/only rule instead of
// waiting for the next scheduled poll.
export async function POST() {
  const result = await pollIcsFeeds();
  return NextResponse.json(result);
}
