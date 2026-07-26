import { NextRequest, NextResponse } from "next/server";
import { hasPasswordProof, createSession } from "@/lib/auth";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  if (!(await hasPasswordProof())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { memberId } = (await req.json().catch(() => ({}))) as { memberId?: string };
  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }
  const member = await db.query.members.findFirst({ where: eq(members.id, memberId) });
  if (!member) {
    return NextResponse.json({ error: "Unknown member" }, { status: 404 });
  }
  await createSession(member.id);
  return NextResponse.json({ ok: true });
}
