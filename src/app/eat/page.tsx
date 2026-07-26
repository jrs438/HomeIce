import { db } from "@/db";
import { getCurrentMember } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { getHebcalInfo } from "@/lib/hebcal";
import { startOfWeek, addDays, ymd } from "@/lib/dates";
import { EatClient } from "@/components/eat/eat-client";

export default async function EatPage() {
  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);

  const [menu, requests, members, currentMember, zip] = await Promise.all([
    db.query.dinnerMenu.findMany({ orderBy: (d, { asc }) => asc(d.date) }),
    db.query.dinnerRequests.findMany({ orderBy: (d, { asc }) => asc(d.createdAt) }),
    db.query.members.findMany(),
    getCurrentMember(),
    getSetting("candle_lighting_zip"),
  ]);

  const hebcal = await getHebcalInfo(zip);
  const yomTovDates = new Set(hebcal.upcomingYomTov.map((y) => y.date));

  const weekMenu = menu.filter((m) => m.date >= ymd(weekStart) && m.date <= ymd(weekEnd));

  return (
    <EatClient
      weekStartIso={weekStart.toISOString()}
      initialMenu={weekMenu}
      initialRequests={requests}
      members={members.map((m) => ({ id: m.id, name: m.name, color: m.color }))}
      currentMemberId={currentMember?.id ?? null}
      yomTovDates={Array.from(yomTovDates)}
    />
  );
}
