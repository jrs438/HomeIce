import { db } from "@/db";
import { getCurrentMember } from "@/lib/auth";
import { MoneyClient } from "@/components/money/money-client";

export default async function MoneyPage() {
  const [members, shifts, reimbursements, currentMember] = await Promise.all([
    db.query.members.findMany({ orderBy: (m, { asc }) => asc(m.createdAt) }),
    db.query.sitterShifts.findMany({ orderBy: (s, { desc }) => desc(s.date) }),
    db.query.reimbursements.findMany({ orderBy: (r, { desc }) => desc(r.date) }),
    getCurrentMember(),
  ]);

  return (
    <MoneyClient
      members={members.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))}
      initialShifts={shifts}
      initialReimbursements={reimbursements}
      currentMemberId={currentMember?.id ?? null}
    />
  );
}
