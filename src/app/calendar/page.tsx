import { db } from "@/db";
import { CalendarClient } from "@/components/calendar/calendar-client";

export default async function CalendarPage() {
  const members = await db.query.members.findMany();

  return (
    <CalendarClient
      members={members.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))}
    />
  );
}
