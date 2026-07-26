import { NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";

export async function POST() {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  await db.update(members).set({ pushSubscription: null }).where(eq(members.id, member.id));
  return NextResponse.json({ ok: true });
}
