import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gmailConfigured, pollAllowlistedEmails } from "@/lib/gmail";
import { runCapture } from "@/lib/capture/run";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!gmailConfigured()) {
    return NextResponse.json({ ok: true, configured: false, note: "Gmail OAuth not configured yet" });
  }

  const parents = await db.query.members.findMany({ where: (m, { eq }) => eq(m.role, "parent") });
  const allowlist = parents.flatMap((p) => p.emails);

  const messages = await pollAllowlistedEmails(allowlist);
  let processed = 0;
  for (const msg of messages) {
    await runCapture({ type: "email", content: msg.body, from: msg.from });
    processed++;
  }

  return NextResponse.json({ ok: true, configured: true, processed });
}
