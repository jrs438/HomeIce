import { db } from "@/db";
import { getAllSettings } from "@/lib/settings";
import { getCurrentMember } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const [members, settings, currentMember] = await Promise.all([
    db.query.members.findMany({ orderBy: (m, { asc }) => asc(m.createdAt) }),
    getAllSettings(),
    getCurrentMember(),
  ]);

  return (
    <SettingsClient
      initialMembers={members}
      initialSettings={settings}
      isAdmin={!!currentMember?.isAdmin}
      currentMemberId={currentMember?.id ?? null}
    />
  );
}
