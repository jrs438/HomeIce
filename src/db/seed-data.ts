import { db } from "./index";
import { members, externalDrivers, settings } from "./schema";
import { SETTINGS_DEFAULTS } from "../lib/settings";
import { sql } from "drizzle-orm";

export async function runSeed() {
  const existing = await db.query.members.findMany();
  if (existing.length > 0) {
    return { skipped: true, reason: "members already seeded" };
  }

  await db.insert(members).values([
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
    {
      name: "Jonah",
      role: "kid",
      color: "#2563EB",
      isAdmin: false,
      emails: [],
      inviteEmail: null,
    },
    {
      name: "Ava",
      role: "kid",
      color: "#DB2777",
      isAdmin: false,
      emails: [],
      inviteEmail: null,
    },
    {
      name: "Emma",
      role: "kid",
      color: "#F59E0B",
      isAdmin: false,
      emails: [],
      inviteEmail: null,
    },
    {
      name: "Sitter (TBD)",
      role: "sitter",
      color: "#0D9488",
      isAdmin: false,
      emails: [],
      inviteEmail: null,
    },
  ]);

  await db.insert(externalDrivers).values([
    { name: "Grandma", label: "Grandma" },
    { name: "Opa", label: "Opa" },
    { name: "Grandi", label: "Grandi" },
    { name: "Bardavid", label: "Bardavid" },
    { name: "Brown", label: "Brown" },
  ]);

  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    await db
      .insert(settings)
      .values({ key, value: { value } })
      .onConflictDoNothing();
  }

  return { skipped: false };
}

export async function seedStatus() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(members);
  return { memberCount: count };
}
