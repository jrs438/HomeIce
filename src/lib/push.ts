import webpush from "web-push";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  webpush.setVapidDetails(
    `mailto:${process.env.GMAIL_USER || "admin@example.com"}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

type PushSubscriptionRecord = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function sendPushToMember(memberId: string, payload: { title: string; body: string; url?: string }) {
  if (!pushConfigured()) return;
  const member = await db.query.members.findFirst({ where: eq(members.id, memberId) });
  const sub = member?.pushSubscription as PushSubscriptionRecord | null;
  if (!sub?.endpoint) return;

  configure();
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await db.update(members).set({ pushSubscription: null }).where(eq(members.id, memberId));
    }
  }
}

export async function sendPushToRoles(roles: ("parent" | "kid" | "sitter")[], payload: { title: string; body: string; url?: string }) {
  if (!pushConfigured()) return;
  const all = await db.query.members.findMany();
  const targets = all.filter((m) => roles.includes(m.role) && m.pushSubscription);
  await Promise.all(targets.map((m) => sendPushToMember(m.id, payload)));
}
