import { NextRequest, NextResponse } from "next/server";
import { parseIcs } from "@/lib/ics";
import { matchesKeyword, textOf } from "@/lib/ics-poll";

// Lets the Settings UI show live "here's what this phrase would catch"
// results against a feed's real, current events — using the exact same
// matcher pollIcsFeeds() uses, so what you see here is what you get.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, query } = body as { url?: string; query?: string };
  if (!url || !query) {
    return NextResponse.json({ error: "url and query are required" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `Couldn't fetch that feed (HTTP ${res.status})` }, { status: 400 });
    }
    const text = await res.text();
    const parsed = parseIcs(text).filter((item) => !item.cancelled);
    const matched = parsed.filter((item) => matchesKeyword(textOf(item), query));

    return NextResponse.json({
      ok: true,
      totalEvents: parsed.length,
      matchCount: matched.length,
      matches: matched.slice(0, 8).map((item) => ({ summary: item.summary, start: item.start.toISOString() })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
