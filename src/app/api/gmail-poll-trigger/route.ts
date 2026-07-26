import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { db } from "@/db";
import { gmailConfigured, pollAllowlistedEmails } from "@/lib/gmail";
import { runCapture } from "@/lib/capture/run";

// Fire-and-forget trigger the client calls on app open so day-of email
// forwards land quickly, without waiting for the cron-job.org interval.
// Safe to call from any signed-in session: idempotent (Gmail messages are
// labeled once processed) and rate-limited by Gmail's own API quotas.
export async function POST() {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!gmailConfigured()) return NextResponse.json({ ok: true, configured: false });

  const parents = await db.query.members.findMany({ where: (m, { eq }) => eq(m.role, "parent") });
  const allowlist = parents.flatMap((p) => p.emails);
  const messages = await pollAllowlistedEmails(allowlist);
  for (const msg of messages) {
    await runCapture({ type: "email", content: msg.body, from: msg.from });
  }

  return NextResponse.json({ ok: true, configured: true, processed: messages.length });
}
