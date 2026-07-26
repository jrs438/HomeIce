import { db } from "@/db";
import { InboxClient } from "@/components/inbox/inbox-client";

export default async function InboxPage() {
  const items = await db.query.inboxItems.findMany({ orderBy: (i, { desc }) => desc(i.createdAt) });

  return (
    <InboxClient
      initialItems={items.map((i) => ({
        id: i.id,
        source: i.source,
        raw: i.raw,
        parsedActions: (i.parsedActions as { type: string; note?: string }[]) ?? [],
        status: i.status,
        fromLabel: i.fromLabel,
        createdAt: i.createdAt.toISOString(),
      }))}
    />
  );
}
