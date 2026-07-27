import { db } from "@/db";
import { events, rides, rideRules, eventRules, groceryItems, chores, dinnerRequests, dinnerMenu, undoLog } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { isoWeekKey } from "@/lib/week";
import { parseWallClockOrUtc, addDays, startOfWeek, ymd, WEEKDAY_LABELS } from "@/lib/dates";
import { FAMILY_TIMEZONE } from "@/lib/family-constants";
import { generateEventsForWeek } from "@/lib/generate-events";
import type { CaptureAction } from "./schema";

type Member = { id: string; name: string; role: string };
type ExternalDriver = { id: string; name: string; label: string };

const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

function nextOccurrence(dayOfWeek: number): string {
  const today = new Date();
  const diff = (dayOfWeek - today.getDay() + 7) % 7;
  return ymd(addDays(today, diff));
}

function resolveKidIds(names: string[] | undefined, members: Member[]): string[] {
  if (!names) return [];
  return names
    .map((n) => members.find((m) => m.name.toLowerCase() === n.toLowerCase())?.id)
    .filter((id): id is string => !!id);
}

function resolveDriver(
  driverType: CaptureAction["driverType"],
  driverName: string | undefined,
  members: Member[],
  externalDrivers: ExternalDriver[]
): { driverType: "member" | "external" | "carpool" | "unassigned"; driverId: string | null } {
  if (driverType === "member" && driverName) {
    const m = members.find((mm) => mm.name.toLowerCase() === driverName.toLowerCase());
    if (m) return { driverType: "member", driverId: m.id };
  }
  if (driverType === "external" && driverName) {
    const d = externalDrivers.find(
      (dd) => dd.name.toLowerCase() === driverName.toLowerCase() || dd.label.toLowerCase() === driverName.toLowerCase()
    );
    if (d) return { driverType: "external", driverId: d.id };
  }
  if (driverType === "carpool") return { driverType: "carpool", driverId: null };
  return { driverType: "unassigned", driverId: null };
}

async function recordUndo(memberId: string | null, description: string, inverseAction: object) {
  const [row] = await db
    .insert(undoLog)
    .values({
      memberId,
      description,
      inverseAction,
      expiresAt: new Date(Date.now() + UNDO_WINDOW_MS),
    })
    .returning();
  return row.id;
}

export type ApplyOutcome = {
  action: CaptureAction;
  applied: boolean;
  instant: boolean;
  summary: string;
  undoId?: string;
};

export async function applyAction(
  action: CaptureAction,
  members: Member[],
  externalDrivers: ExternalDriver[]
): Promise<ApplyOutcome> {
  switch (action.type) {
    case "add_event": {
      if (!action.title || !action.start) {
        return { action, applied: false, instant: false, summary: "Missing title/start for event" };
      }
      const [created] = await db
        .insert(events)
        .values({
          title: action.title,
          start: action.allDay ? new Date(action.start) : parseWallClockOrUtc(action.start, FAMILY_TIMEZONE),
          end: action.end ? (action.allDay ? new Date(action.end) : parseWallClockOrUtc(action.end, FAMILY_TIMEZONE)) : null,
          allDay: !!action.allDay,
          location: action.location || null,
          kidIds: resolveKidIds(action.kidNames, members),
          source: "capture",
          notes: action.notes || null,
          status: "confirmed",
        })
        .returning();
      const undoId = await recordUndo(null, `Added event "${created.title}"`, {
        kind: "delete_event",
        eventId: created.id,
      });
      return { action, applied: true, instant: false, summary: `Added event "${created.title}"`, undoId };
    }

    case "add_recurring_event": {
      if (!action.title || action.dayOfWeek === undefined || !action.startTime) {
        return { action, applied: false, instant: false, summary: "Missing title/day/time for recurring event" };
      }
      const [created] = await db
        .insert(eventRules)
        .values({
          title: action.title,
          dayOfWeek: action.dayOfWeek,
          intervalWeeks: action.intervalWeeks ?? 1,
          anchorDate: nextOccurrence(action.dayOfWeek),
          startTime: action.startTime,
          endTime: action.endTime || null,
          location: action.location || null,
          kidIds: resolveKidIds(action.kidNames, members),
          notes: action.notes || null,
        })
        .returning();

      const weekStart = startOfWeek(new Date());
      for (let w = 0; w < 4; w++) {
        await generateEventsForWeek(addDays(weekStart, w * 7));
      }

      const undoId = await recordUndo(null, `Added recurring event "${created.title}"`, {
        kind: "delete_event_rule",
        eventRuleId: created.id,
      });
      const cadence =
        created.intervalWeeks > 1 ? `every ${created.intervalWeeks} weeks on ${WEEKDAY_LABELS[created.dayOfWeek]}` : `every ${WEEKDAY_LABELS[created.dayOfWeek]}`;
      return { action, applied: true, instant: false, summary: `Added "${created.title}" (${cadence})`, undoId };
    }

    case "cancel_event": {
      if (!action.title) return { action, applied: false, instant: false, summary: "Missing title for cancel" };
      const match = await db.query.events.findFirst({
        where: and(ilike(events.title, `%${action.title}%`)),
      });
      if (!match) return { action, applied: false, instant: false, summary: `Could not find event "${action.title}" to cancel` };
      await db.update(events).set({ status: "cancelled" }).where(eq(events.id, match.id));
      const undoId = await recordUndo(null, `Cancelled event "${match.title}"`, {
        kind: "set_event_status",
        eventId: match.id,
        status: match.status,
      });
      return { action, applied: true, instant: false, summary: `Cancelled "${match.title}"`, undoId };
    }

    case "modify_event": {
      if (!action.title) return { action, applied: false, instant: false, summary: "Missing title for modify" };
      const match = await db.query.events.findFirst({ where: ilike(events.title, `%${action.title}%`) });
      if (!match) return { action, applied: false, instant: false, summary: `Could not find event "${action.title}" to modify` };
      const prev = { title: match.title, start: match.start, end: match.end, location: match.location, notes: match.notes };
      await db
        .update(events)
        .set({
          start: action.start
            ? match.allDay
              ? new Date(action.start)
              : parseWallClockOrUtc(action.start, FAMILY_TIMEZONE)
            : match.start,
          end: action.end
            ? match.allDay
              ? new Date(action.end)
              : parseWallClockOrUtc(action.end, FAMILY_TIMEZONE)
            : match.end,
          location: action.location ?? match.location,
          notes: action.notes ?? match.notes,
          updatedAt: new Date(),
        })
        .where(eq(events.id, match.id));
      const undoId = await recordUndo(null, `Modified event "${match.title}"`, {
        kind: "restore_event_fields",
        eventId: match.id,
        fields: prev,
      });
      return { action, applied: true, instant: false, summary: `Updated "${match.title}"`, undoId };
    }

    case "assign_ride": {
      if (!action.date || !action.kind) return { action, applied: false, instant: false, summary: "Missing date/kind for ride" };
      const driver = resolveDriver(action.driverType, action.driverName, members, externalDrivers);
      const existing = await db.query.rides.findFirst({
        where: and(eq(rides.date, action.date), eq(rides.kind, action.kind)),
      });
      if (existing) {
        const prevDriver = { driverType: existing.driverType, driverId: existing.driverId };
        await db
          .update(rides)
          .set({ driverType: driver.driverType, driverId: driver.driverId, confirmed: true, updatedAt: new Date() })
          .where(eq(rides.id, existing.id));
        const undoId = await recordUndo(null, `Assigned ride driver`, {
          kind: "set_ride_driver",
          rideId: existing.id,
          ...prevDriver,
        });
        return { action, applied: true, instant: false, summary: `Assigned driver for ${action.date} ${action.kind}`, undoId };
      }
      const [created] = await db
        .insert(rides)
        .values({
          date: action.date,
          time: action.time || "15:30",
          kind: action.kind,
          kidIds: resolveKidIds(action.kidNames, members),
          from: action.from || "",
          to: action.to || "",
          driverType: driver.driverType,
          driverId: driver.driverId,
          confirmed: true,
        })
        .returning();
      const undoId = await recordUndo(null, `Created ride`, { kind: "delete_ride", rideId: created.id });
      return { action, applied: true, instant: false, summary: `Created ride on ${action.date}`, undoId };
    }

    case "add_ride_rule": {
      if (!action.label || action.dayOfWeek === undefined || !action.kind || !action.from || !action.to) {
        return { action, applied: false, instant: false, summary: "Missing fields for ride rule" };
      }
      const driver = resolveDriver(action.driverType, action.driverName, members, externalDrivers);
      const [created] = await db
        .insert(rideRules)
        .values({
          label: action.label,
          dayOfWeek: action.dayOfWeek,
          kind: action.kind,
          kidIds: resolveKidIds(action.kidNames, members),
          from: action.from,
          to: action.to,
          time: action.time || null,
          driverType: driver.driverType,
          driverId: driver.driverId,
        })
        .returning();
      const undoId = await recordUndo(null, `Added ride default "${created.label}"`, {
        kind: "delete_ride_rule",
        ruleId: created.id,
      });
      return { action, applied: true, instant: false, summary: `Added ride default "${created.label}"`, undoId };
    }

    case "add_grocery": {
      if (!action.items?.length) return { action, applied: false, instant: true, summary: "No grocery items given" };
      const created = await db.insert(groceryItems).values(action.items.map((i) => ({ store: i.store, item: i.item }))).returning();
      const undoId = await recordUndo(
        null,
        `Added ${created.length} grocery item(s)`,
        { kind: "delete_grocery_items", ids: created.map((c) => c.id) }
      );
      return { action, applied: true, instant: true, summary: `Added ${created.length} item(s) to the list`, undoId };
    }

    case "add_chore": {
      if (!action.kidName || !action.title) return { action, applied: false, instant: false, summary: "Missing kid/title for chore" };
      const kid = members.find((m) => m.name.toLowerCase() === action.kidName!.toLowerCase());
      const [created] = await db
        .insert(chores)
        .values({
          memberId: kid?.id || null,
          title: action.title,
          cadence: action.cadence || "weekly",
          week: isoWeekKey(new Date()),
        })
        .returning();
      const undoId = await recordUndo(null, `Added job "${created.title}"`, { kind: "delete_chore", choreId: created.id });
      return { action, applied: true, instant: false, summary: `Added job "${created.title}"`, undoId };
    }

    case "request_dinner": {
      if (!action.text) return { action, applied: false, instant: true, summary: "Missing dinner request text" };
      const [created] = await db.insert(dinnerRequests).values({ text: action.text, votes: [] }).returning();
      const undoId = await recordUndo(null, `Requested dinner "${created.text}"`, {
        kind: "delete_dinner_request",
        id: created.id,
      });
      return { action, applied: true, instant: true, summary: `Requested "${created.text}" for dinner`, undoId };
    }

    case "set_menu": {
      if (!action.date || !action.meal) return { action, applied: false, instant: false, summary: "Missing date/meal" };
      const existing = await db.query.dinnerMenu.findFirst({ where: eq(dinnerMenu.date, action.date) });
      if (existing) {
        const prevMeal = existing.meal;
        await db.update(dinnerMenu).set({ meal: action.meal }).where(eq(dinnerMenu.id, existing.id));
        const undoId = await recordUndo(null, `Set menu for ${action.date}`, {
          kind: "set_menu_meal",
          id: existing.id,
          meal: prevMeal,
        });
        return { action, applied: true, instant: false, summary: `Set ${action.date} dinner to "${action.meal}"`, undoId };
      }
      const [created] = await db.insert(dinnerMenu).values({ date: action.date, meal: action.meal }).returning();
      const undoId = await recordUndo(null, `Set menu for ${action.date}`, { kind: "delete_dinner_menu", id: created.id });
      return { action, applied: true, instant: false, summary: `Set ${action.date} dinner to "${action.meal}"`, undoId };
    }

    case "unknown":
    default:
      return { action, applied: false, instant: false, summary: action.note || "Could not parse this input" };
  }
}

export async function applyUndo(inverseAction: Record<string, unknown>) {
  switch (inverseAction.kind) {
    case "delete_event":
      await db.delete(events).where(eq(events.id, inverseAction.eventId as string));
      return;
    case "delete_event_rule":
      await db.delete(eventRules).where(eq(eventRules.id, inverseAction.eventRuleId as string));
      return;
    case "set_event_status":
      await db
        .update(events)
        .set({ status: inverseAction.status as "proposed" | "confirmed" | "cancelled" })
        .where(eq(events.id, inverseAction.eventId as string));
      return;
    case "restore_event_fields":
      await db
        .update(events)
        .set(inverseAction.fields as Partial<typeof events.$inferInsert>)
        .where(eq(events.id, inverseAction.eventId as string));
      return;
    case "delete_ride":
      await db.delete(rides).where(eq(rides.id, inverseAction.rideId as string));
      return;
    case "set_ride_driver":
      await db
        .update(rides)
        .set({
          driverType: inverseAction.driverType as "member" | "external" | "carpool" | "unassigned",
          driverId: (inverseAction.driverId as string) || null,
        })
        .where(eq(rides.id, inverseAction.rideId as string));
      return;
    case "delete_ride_rule":
      await db.delete(rideRules).where(eq(rideRules.id, inverseAction.ruleId as string));
      return;
    case "delete_grocery_items":
      for (const id of inverseAction.ids as string[]) {
        await db.delete(groceryItems).where(eq(groceryItems.id, id));
      }
      return;
    case "delete_chore":
      await db.delete(chores).where(eq(chores.id, inverseAction.choreId as string));
      return;
    case "delete_dinner_request":
      await db.delete(dinnerRequests).where(eq(dinnerRequests.id, inverseAction.id as string));
      return;
    case "set_menu_meal":
      await db.update(dinnerMenu).set({ meal: inverseAction.meal as string }).where(eq(dinnerMenu.id, inverseAction.id as string));
      return;
    case "delete_dinner_menu":
      await db.delete(dinnerMenu).where(eq(dinnerMenu.id, inverseAction.id as string));
      return;
  }
}
