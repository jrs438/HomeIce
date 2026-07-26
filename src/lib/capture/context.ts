import { db } from "@/db";
import { getSetting } from "@/lib/settings";
import { FAMILY_KID_CONTEXT } from "@/lib/family-constants";
import { startOfWeek, addDays, ymd } from "@/lib/dates";
import { and, gte, lte } from "drizzle-orm";
import { events } from "@/db/schema";

export async function buildCaptureSystemPrompt(): Promise<string> {
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
- Resolve driver references ("my mom", "grandma", a family member's name) to the exact name above in driverName, and set driverType to "member" or "external" accordingly. Use "carpool" only if the input explicitly says carpool. Use "unassigned" if no driver is mentioned.
- Resolve store references to the exact store name above.
- If a date is genuinely ambiguous (e.g. "next practice" with no other context), do not guess — instead set clarification_needed to a specific question, and still record any actions you ARE confident about.
- If the input doesn't map to any known action, return an empty actions array; the raw text will be preserved automatically.
- Never fabricate details not present in the input.`;
}
