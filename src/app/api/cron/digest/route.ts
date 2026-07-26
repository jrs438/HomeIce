import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { requireCronSecret } from "@/lib/require-cron";
import { mailerConfigured, getTransport } from "@/lib/mailer";
import { getSetting } from "@/lib/settings";
import { startOfWeek, addDays, ymd, WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/dates";
import { and, gte, lte, ne, eq } from "drizzle-orm";
import { events, rides, dinnerMenu, inboxItems } from "@/db/schema";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const digestDay = await getSetting("digest_day");
  const now = new Date();
  if (DAY_NAMES[now.getDay()] !== digestDay.toLowerCase()) {
    return NextResponse.json({ ok: true, skipped: true, reason: `today is not ${digestDay}` });
  }

  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);

  const [weekEvents, weekRides, weekMenu, openInbox, members] = await Promise.all([
    db.query.events.findMany({
      where: and(ne(events.status, "cancelled"), gte(events.start, weekStart), lte(events.start, weekEnd)),
      orderBy: (e, { asc }) => asc(e.start),
    }),
    db.query.rides.findMany({
      where: and(gte(rides.date, ymd(weekStart)), lte(rides.date, ymd(addDays(weekStart, 6)))),
      orderBy: (r, { asc }) => [asc(r.date), asc(r.time)],
    }),
    db.query.dinnerMenu.findMany({
      where: and(gte(dinnerMenu.date, ymd(weekStart)), lte(dinnerMenu.date, ymd(addDays(weekStart, 6)))),
      orderBy: (d, { asc }) => asc(d.date),
    }),
    db.query.inboxItems.findMany({ where: eq(inboxItems.status, "pending") }),
    db.query.members.findMany(),
  ]);

  const unassignedRides = weekRides.filter((r) => r.driverType === "unassigned");
  const kidById = new Map(members.map((m) => [m.id, m.name]));

  const eventLines = weekEvents
    .map((e) => {
      const d = new Date(e.start);
      const kids = e.kidIds.map((id) => kidById.get(id)).filter(Boolean).join(", ");
      return `<li>${WEEKDAY_LABELS[d.getDay()]} ${MONTH_LABELS[d.getMonth()]} ${d.getDate()} — <strong>${e.title}</strong>${kids ? ` (${kids})` : ""}</li>`;
    })
    .join("");

  const unassignedLines = unassignedRides
    .map((r) => `<li style="color:#b91c1c">${r.date} ${r.time} — ${r.from} → ${r.to} (no driver)</li>`)
    .join("");

  const menuLines = weekMenu.map((m) => `<li>${m.date}: ${m.meal}</li>`).join("");

  const html = `
    <h2>HomeIce — Week of ${MONTH_LABELS[weekStart.getMonth()]} ${weekStart.getDate()}</h2>
    <h3>This week's events</h3>
    <ul>${eventLines || "<li>Nothing scheduled</li>"}</ul>
    <h3>Unassigned rides${unassignedRides.length ? ` (${unassignedRides.length})` : ""}</h3>
    <ul>${unassignedLines || "<li>All rides covered 🎉</li>"}</ul>
    <h3>Dinner menu</h3>
    <ul>${menuLines || "<li>Not planned yet</li>"}</ul>
    <h3>Open inbox items</h3>
    <p>${openInbox.length} item(s) waiting for review in the Inbox tab.</p>
  `;

  if (!mailerConfigured()) {
    return NextResponse.json({ ok: true, sent: false, note: "Gmail SMTP not configured / not yet verified" });
  }

  const parents = members.filter((m) => m.role === "parent");
  const recipients = parents.map((p) => p.emails[0]).filter(Boolean);

  try {
    await getTransport().sendMail({
      from: process.env.GMAIL_USER,
      to: recipients.join(", "),
      subject: `HomeIce weekly digest — week of ${MONTH_LABELS[weekStart.getMonth()]} ${weekStart.getDate()}`,
      html,
    });
    return NextResponse.json({ ok: true, sent: true, recipients });
  } catch (err) {
    return NextResponse.json(
      { ok: false, sent: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
