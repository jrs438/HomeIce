import { db } from "@/db";
import { chores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isoWeekKey } from "@/lib/week";
import { JobsClient } from "@/components/jobs/jobs-client";

export default async function JobsPage() {
  const week = isoWeekKey(new Date());

  const [members, weekChores] = await Promise.all([
    db.query.members.findMany(),
    db.query.chores.findMany({ where: eq(chores.week, week), orderBy: (c, { asc }) => asc(c.createdAt) }),
  ]);

  const kids = members.filter((m) => m.role === "kid").map((m) => ({ id: m.id, name: m.name, color: m.color }));

  return <JobsClient week={week} kids={kids} initialChores={weekChores} />;
}
