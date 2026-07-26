import { db } from "@/db";
import { RidesClient } from "@/components/rides/rides-client";

export default async function RidesPage() {
  const [members, externalDrivers, rules] = await Promise.all([
    db.query.members.findMany(),
    db.query.externalDrivers.findMany({ orderBy: (d, { asc }) => asc(d.name) }),
    db.query.rideRules.findMany({ orderBy: (r, { asc }) => [asc(r.dayOfWeek), asc(r.time)] }),
  ]);

  return (
    <RidesClient
      members={members.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))}
      externalDrivers={externalDrivers}
      initialRules={rules}
    />
  );
}
