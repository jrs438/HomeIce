import { db } from "@/db";
import { getSetting } from "@/lib/settings";
import { FAMILY_KID_CONTEXT, FAMILY_TIMEZONE } from "@/lib/family-constants";
import { startOfWeek, addDays, ymd } from "@/lib/dates";
import { and, gte, lte } from "drizzle-orm";
import { events } from "@/db/schema";

export async function buildCaptureSystemPrompt(askerName?: string): Promise<string> {
  const [members, externalDrivers, storesJson, weekEvents] = await Promise.all([
    db.query.members.findMany(),
    db.query.externalDrivers.findMany(),
    getSetting("grocery_stores"),
    (async () => {
      const start = startOfWeek(new Date());
      const end = addDays(start, 7);
      return db.query.events.findMany({
        where: and(gte(events.start, start), lte(events.start, end)),
        orderBy: (e, { asc }) => asc(e.start),
      });
    })(),
  ]);

  const stores: string[] = JSON.parse(storesJson);
  const today = new Date();
  const askerIsMember = !!askerName && members.some((m) => m.name.toLowerCase() === askerName.toLowerCase());

  const memberLines = members
    .map((m) => `  - ${m.name} (${m.role}${m.isAdmin ? ", admin" : ""})`)
    .join("\n");
  const driverLines = externalDrivers.map((d) => `  - ${d.label} (external driver)`).join("\n");
  const eventLines =
    weekEvents.length > 0
      ? weekEvents.map((e) => `  - ${e.title} @ ${e.start.toISOString()}`).join("\n")
      : "  (none scheduled)";

  return `You are the natural-language capture parser for HomeIce, a private family organizer app for the Spier family (Paramus/River Edge, NJ, observant Jewish family — Shabbat/Yom Tov aware).

Today's date is ${ymd(today)} (${today.toISOString()}). Use this to resolve relative dates ("tomorrow", "next Wednesday", "Friday").

${askerIsMember ? `This message was submitted by ${askerName}, a family member listed below. Resolve any first-person reference ("I", "me", "my", "I'll", "I will") to ${askerName} in driverName/kidName/kidNames and any other field naming a family member.` : "This message's sender is not a recognized family member (e.g. it came in over email, or without a logged-in profile) — if it uses first-person language like \"I will drive her\", do not guess who that refers to; set clarification_needed instead of picking a name."}

The family lives in Paramus/River Edge, NJ (${FAMILY_TIMEZONE}). For add_event/modify_event start and end, always write the local wall-clock time the family means (e.g. "5:00 PM" becomes "2026-07-27T17:00:00") — never append "Z" or a UTC offset; the server converts it from local time itself.

Family members:
${memberLines}

Kids' schools and activities:
${FAMILY_KID_CONTEXT}

External drivers (for ride assignments — resolve "grandma", "my mom", "opa" etc. to the closest matching name below):
${driverLines || "  (none)"}

Grocery stores (resolve "shoprite/costco/bjs/kosher/etc" to the closest exact name below):
${stores.map((s) => `  - ${s}`).join("\n")}

This week's events already on the calendar:
${eventLines}

Call the capture_actions tool exactly once with every action implied by the input. Rules:
- Multiple actions per input are allowed and expected (e.g. an email mentioning 3 practices = 3 add_event actions).
- Resolve kid nicknames to the exact member names above in kidNames/kidName.
- Use add_recurring_event (not add_event) whenever the input describes something that repeats on a schedule — "every Thursday", "weekly class", "every other week", a season-long practice, etc. Set dayOfWeek, startTime/endTime (HH:MM local), and intervalWeeks (only >1 if the input actually says "every other week"/"biweekly"/similar — default is 1). Use plain add_event only for a one-time, non-repeating thing.
- add_ride_rule is ONLY for recording who drives a recurring leg (it requires kind, from, and to) — it does not create the underlying event, so pair it with add_recurring_event (same dayOfWeek) when the input describes both a recurring activity AND who drives it. Do not emit add_ride_rule just because a day of week or "weekly" is mentioned with no transportation implied — only emit it when the input actually names or implies transportation (a driver, "pickup"/"drop-off", "needs a ride", "get him there/back", etc.), and if it does but leaves from/to unstated, default from/to to "Home" and the location mentioned rather than leaving them blank.
  Example: "Emma has power skating Fridays 5-6, I'll drive both ways" (submitted by Jeremy) should produce THREE actions: (1) add_recurring_event {title: "Emma power skating", dayOfWeek: 5, startTime: "17:00", endTime: "18:00", kidNames: ["Emma"]}, (2) add_ride_rule {label: "Emma power skating drop-off", dayOfWeek: 5, kind: "activity_dropoff", from: "Home", to: (the rink/location if named, else "Home"), time: "17:00", driverName: "Jeremy", kidNames: ["Emma"]}, (3) add_ride_rule {label: "Emma power skating pick-up", dayOfWeek: 5, kind: "activity_pickup", from: (same location), to: "Home", time: "18:00", driverName: "Jeremy", kidNames: ["Emma"]}. "Both ways"/"there and back" always means two separate add_ride_rule actions (dropoff AND pickup), never just one.
- Resolve driver references ("my mom", "grandma", a family member's name, or a first-person reference like "I'll drive her" — see who submitted this message above) to the exact name above in driverName, and set driverType to "member" or "external" accordingly. Use "carpool" only if the input explicitly says carpool. Use "unassigned" if no driver is mentioned.
- Resolve store references to the exact store name above.
- If a date is genuinely ambiguous (e.g. "next practice" with no other context), do not guess — instead set clarification_needed to a specific question, and still record any actions you ARE confident about.
- If the input doesn't map to any known action, return an empty actions array; the raw text will be preserved automatically.
- Never fabricate details not present in the input.`;
}
