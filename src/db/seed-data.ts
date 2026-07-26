import { db } from "./index";
import {
  members,
  externalDrivers,
  settings,
  events,
  rides,
  rideRules,
  groceryItems,
  chores,
  dinnerMenu,
  dinnerRequests,
} from "./schema";
import { SETTINGS_DEFAULTS } from "../lib/settings";
import { sql, eq } from "drizzle-orm";
import { startOfWeek, addDays, ymd } from "../lib/dates";
import { isoWeekKey } from "../lib/week";

const SAMPLE_WEEK_FLAG = "sample_week_seeded_at";

async function seedMembersAndDrivers() {
  const existingMembers = await db.query.members.findMany();
  if (existingMembers.length > 0) return { members: existingMembers, seeded: false };

  const inserted = await db
    .insert(members)
    .values([
      {
        name: "Jeremy",
        role: "parent",
        color: "#059669",
        isAdmin: true,
        emails: ["jeremy.spier@gmail.com", "jeremy.spier@parthenon.ey.com"],
        inviteEmail: "jeremy.spier@parthenon.ey.com",
      },
      {
        name: "Shira",
        role: "parent",
        color: "#7C3AED",
        isAdmin: true,
        emails: ["shira1023@gmail.com", "slspier@kpmg.com"],
        inviteEmail: "slspier@kpmg.com",
      },
      { name: "Jonah", role: "kid", color: "#2563EB", isAdmin: false, emails: [], inviteEmail: null },
      { name: "Ava", role: "kid", color: "#DB2777", isAdmin: false, emails: [], inviteEmail: null },
      { name: "Emma", role: "kid", color: "#F59E0B", isAdmin: false, emails: [], inviteEmail: null },
      { name: "Sitter (TBD)", role: "sitter", color: "#0D9488", isAdmin: false, emails: [], inviteEmail: null },
    ])
    .returning();

  await db.insert(externalDrivers).values([
    { name: "Grandma", label: "Grandma" },
    { name: "Opa", label: "Opa" },
    { name: "Grandi", label: "Grandi" },
    { name: "Bardavid", label: "Bardavid" },
    { name: "Brown", label: "Brown" },
  ]);

  return { members: inserted, seeded: true };
}

async function seedSettings() {
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    await db
      .insert(settings)
      .values({ key, value: { value } })
      .onConflictDoNothing();
  }
}

async function seedSampleWeek() {
  const flag = await db.query.settings.findFirst({ where: eq(settings.key, SAMPLE_WEEK_FLAG) });
  if (flag) return { seeded: false };

  const allMembers = await db.query.members.findMany();
  const allDrivers = await db.query.externalDrivers.findMany();
  const byName = (name: string) => allMembers.find((m) => m.name === name);
  const driverByName = (name: string) => allDrivers.find((d) => d.name === name);

  const jonah = byName("Jonah");
  const ava = byName("Ava");
  const emma = byName("Emma");
  const dad = byName("Jeremy");
  const grandma = driverByName("Grandma");
  const bardavid = driverByName("Bardavid");

  const weekStart = startOfWeek(new Date());
  const day = (offset: number, hour: number, minute = 0) => {
    const d = addDays(weekStart, offset);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  if (jonah && ava && emma) {
    await db.insert(events).values([
      {
        title: "Jonah hockey practice",
        start: day(2, 18, 0),
        end: day(2, 19, 30),
        location: "Ice House Paramus",
        kidIds: [jonah.id],
        source: "manual",
        status: "confirmed",
      },
      {
        title: "Jonah hockey game",
        start: day(4, 19, 0),
        end: day(4, 20, 30),
        location: "Ice House Paramus",
        kidIds: [jonah.id],
        source: "manual",
        status: "confirmed",
      },
      {
        title: "Ava dance class",
        start: day(3, 16, 30),
        end: day(3, 17, 30),
        location: "River Edge Dance Studio",
        kidIds: [ava.id],
        source: "manual",
        status: "confirmed",
      },
      {
        title: "Emma gymnastics",
        start: day(2, 16, 0),
        end: day(2, 17, 0),
        location: "Paramus Gymnastics",
        kidIds: [emma.id],
        source: "manual",
        status: "confirmed",
      },
      {
        title: "Emma hockey (mini-mites)",
        start: day(6, 9, 0),
        end: day(6, 10, 0),
        location: "Ice House Paramus",
        kidIds: [emma.id],
        source: "manual",
        status: "confirmed",
      },
    ]);

    await db.insert(rides).values([
      {
        date: ymd(day(3, 17, 30)),
        time: "17:30",
        kind: "activity_pickup",
        kidIds: [ava.id],
        from: "River Edge Dance Studio",
        to: "Home",
        driverType: grandma ? "external" : "unassigned",
        driverId: grandma?.id ?? null,
        confirmed: !!grandma,
      },
      {
        date: ymd(day(4, 19, 0)),
        time: "19:00",
        kind: "activity_dropoff",
        kidIds: [jonah.id],
        from: "Home",
        to: "Ice House Paramus",
        driverType: bardavid ? "external" : "unassigned",
        driverId: bardavid?.id ?? null,
        confirmed: !!bardavid,
      },
      {
        date: ymd(day(4, 20, 30)),
        time: "20:30",
        kind: "activity_pickup",
        kidIds: [jonah.id],
        from: "Ice House Paramus",
        to: "Home",
        driverType: dad ? "member" : "unassigned",
        driverId: dad?.id ?? null,
        confirmed: !!dad,
      },
      {
        date: ymd(day(2, 17, 0)),
        time: "17:00",
        kind: "activity_pickup",
        kidIds: [emma.id],
        from: "Paramus Gymnastics",
        to: "Home",
        driverType: "unassigned",
        confirmed: false,
      },
    ]);

    if (grandma) {
      await db.insert(rideRules).values({
        label: "Wed dance pickup",
        dayOfWeek: 3,
        kind: "activity_pickup",
        kidIds: [ava.id],
        from: "River Edge Dance Studio",
        to: "Home",
        time: "17:30",
        driverType: "external",
        driverId: grandma.id,
      });
    }
    if (bardavid && dad) {
      await db.insert(rideRules).values([
        {
          label: "Thu hockey there",
          dayOfWeek: 4,
          kind: "activity_dropoff",
          kidIds: [jonah.id],
          from: "Home",
          to: "Ice House Paramus",
          time: "19:00",
          driverType: "external",
          driverId: bardavid.id,
        },
        {
          label: "Thu hockey back",
          dayOfWeek: 4,
          kind: "activity_pickup",
          kidIds: [jonah.id],
          from: "Ice House Paramus",
          to: "Home",
          time: "20:30",
          driverType: "member",
          driverId: dad.id,
        },
      ]);
    }

    await db.insert(chores).values([
      { memberId: jonah.id, title: "Take out trash", week: isoWeekKey(new Date()), cadence: "weekly" },
      { memberId: ava.id, title: "Set the table", week: isoWeekKey(new Date()), cadence: "daily" },
      { memberId: emma.id, title: "Feed the fish", week: isoWeekKey(new Date()), cadence: "daily" },
    ]);
  }

  await db.insert(groceryItems).values([
    { store: "Costco", item: "Eggs" },
    { store: "Costco", item: "Paper towels" },
    { store: "ShopRite", item: "Milk" },
    { store: "Cedar Market", item: "Challah" },
  ]);

  await db.insert(dinnerMenu).values([
    { date: ymd(day(1, 0)), meal: "Pasta night" },
    { date: ymd(day(3, 0)), meal: "Tacos" },
    { date: ymd(day(5, 0)), meal: "Shabbat dinner — chicken & sides" },
  ]);

  await db.insert(dinnerRequests).values([
    { memberId: jonah?.id ?? null, text: "Pizza", votes: jonah ? [jonah.id] : [] },
    { memberId: emma?.id ?? null, text: "Mac and cheese", votes: [] },
  ]);

  await db
    .insert(settings)
    .values({ key: SAMPLE_WEEK_FLAG, value: { value: new Date().toISOString() } })
    .onConflictDoNothing();

  return { seeded: true };
}

export async function runSeed() {
  const { seeded: membersSeeded } = await seedMembersAndDrivers();
  await seedSettings();
  const { seeded: sampleSeeded } = await seedSampleWeek();

  return { membersSeeded, sampleSeeded };
}

export async function seedStatus() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(members);
  return { memberCount: count };
}
