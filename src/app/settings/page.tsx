import { db } from "@/db";
import { getAllSettings } from "@/lib/settings";
import { getCurrentMember } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const [members, externalDrivers, icsFeeds, settings, currentMember] = await Promise.all([
    db.query.members.findMany({ orderBy: (m, { asc }) => asc(m.createdAt) }),
    db.query.externalDrivers.findMany({ orderBy: (d, { asc }) => asc(d.name) }),
    db.query.icsFeeds.findMany({ orderBy: (f, { asc }) => asc(f.label) }),
    getAllSettings(),
    getCurrentMember(),
  ]);

  return (
    <SettingsClient
      initialMembers={members}
      initialExternalDrivers={externalDrivers}
      initialIcsFeeds={icsFeeds}
      initialSettings={settings}
      isAdmin={!!currentMember?.isAdmin}
      currentMemberId={currentMember?.id ?? null}
    />
  );
}
