import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { icsFeeds, events, rides } from "@/db/schema";
import { eq, and, ne, ilike, inArray } from "drizzle-orm";

const GAME_PLACEHOLDER = /-\s*Game\s*#\d+$/i;

/**
 * One-time cleanup for an ICS feed (e.g. TeamSnap) that published two
 * permanently separate calendar entries for the same real-world event — a
 * generic placeholder ("... - Game #2") and a detailed one with the real
 * matchup once finalized — each with its own stable UID, so the UID-rotation
 * matching added earlier (which only merges when an OLD uid's event is still
 * the single unambiguous candidate at poll time) never had a chance to catch
 * them: both already existed as separate confirmed rows before that fix
 * shipped.
 *
 * Groups non-cancelled events from the feed by identical (start, end).
 * Within each group of 2+, keeps one (preferring whichever already has a
 * ride linked to it, so an existing driver assignment isn't lost; otherwise
 * preferring the non-placeholder "real matchup" title) and reassigns any
 * linked rides from the others onto the keeper before deleting them.
 *
 * Defaults to a dry run (no writes) so the plan can be reviewed first; pass
 * dryRun: false to actually apply it.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const label: string | undefined = body.label;
  // Accept either casing -- a human typing this into a phone keyboard is
  // more likely to get the capitalization wrong than to mean "run it for
  // real" when they wrote dryRun/dryrun/DryRun with any value but false.
  const dryRunValue = body.dryRun ?? body.dryrun ?? body.DryRun;
  const dryRun = dryRunValue !== false && dryRunValue !== "false";
  if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 });

  const feed = await db.query.icsFeeds.findFirst({ where: ilike(icsFeeds.label, `%${label}%`) });
  if (!feed) return NextResponse.json({ error: "No feed matching that label" }, { status: 404 });

  const feedEvents = await db.query.events.findMany({
    where: and(eq(events.source, "ics"), eq(events.sourceRef, feed.id), ne(events.status, "cancelled")),
    orderBy: (e, { asc }) => asc(e.start),
  });

  const groups = new Map<string, typeof feedEvents>();
  for (const e of feedEvents) {
    const key = `${e.start.getTime()}_${e.end ? e.end.getTime() : "null"}`;
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }

  const duplicateGroups = Array.from(groups.values()).filter((g) => g.length > 1);

  const allEventIds = duplicateGroups.flat().map((e) => e.id);
  const ridesByEventId = allEventIds.length
    ? await db.query.rides.findMany({ where: inArray(rides.eventId, allEventIds) })
    : [];
  const rideCountByEvent = new Map<string, number>();
  for (const r of ridesByEventId) {
    if (!r.eventId) continue;
    rideCountByEvent.set(r.eventId, (rideCountByEvent.get(r.eventId) ?? 0) + 1);
  }

  const plan: {
    keep: { id: string; title: string };
    remove: { id: string; title: string; rideCount: number }[];
  }[] = [];

  for (const group of duplicateGroups) {
    const withRides = group.filter((e) => (rideCountByEvent.get(e.id) ?? 0) > 0);
    const keeper =
      withRides[0] ??
      group.find((e) => !GAME_PLACEHOLDER.test(e.title)) ??
      group[0];
    const toRemove = group.filter((e) => e.id !== keeper.id);

    plan.push({
      keep: { id: keeper.id, title: keeper.title },
      remove: toRemove.map((e) => ({ id: e.id, title: e.title, rideCount: rideCountByEvent.get(e.id) ?? 0 })),
    });

    if (!dryRun) {
      for (const loser of toRemove) {
        await db.update(rides).set({ eventId: keeper.id }).where(eq(rides.eventId, loser.id));
        await db.delete(events).where(eq(events.id, loser.id));
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    feed: feed.label,
    duplicateGroupsFound: duplicateGroups.length,
    plan,
  });
}
