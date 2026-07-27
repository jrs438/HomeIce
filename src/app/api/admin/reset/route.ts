import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  rides,
  eventRules,
  eventExceptions,
  rideRules,
  groceryItems,
  chores,
  dinnerMenu,
  dinnerRequests,
  inboxItems,
  undoLog,
} from "@/db/schema";

// Wipes all scheduling/planning content back to a blank slate — every event,
// ride, recurring rule, grocery item, chore, dinner entry, inbox item, and
// pending undo. Deliberately leaves members, external drivers, and settings
// (family password, stores, etc.) untouched. Irreversible.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const counts = {
    rides: (await db.delete(rides).returning({ id: rides.id })).length,
    eventExceptions: (await db.delete(eventExceptions).returning({ id: eventExceptions.id })).length,
    rideRules: (await db.delete(rideRules).returning({ id: rideRules.id })).length,
    eventRules: (await db.delete(eventRules).returning({ id: eventRules.id })).length,
    events: (await db.delete(events).returning({ id: events.id })).length,
    groceryItems: (await db.delete(groceryItems).returning({ id: groceryItems.id })).length,
    chores: (await db.delete(chores).returning({ id: chores.id })).length,
    dinnerMenu: (await db.delete(dinnerMenu).returning({ id: dinnerMenu.id })).length,
    dinnerRequests: (await db.delete(dinnerRequests).returning({ id: dinnerRequests.id })).length,
    inboxItems: (await db.delete(inboxItems).returning({ id: inboxItems.id })).length,
    undoLog: (await db.delete(undoLog).returning({ id: undoLog.id })).length,
  };

  return NextResponse.json({ ok: true, deleted: counts });
}
