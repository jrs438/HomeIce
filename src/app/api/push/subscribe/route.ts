import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const subscription = await req.json();
  await db.update(members).set({ pushSubscription: subscription }).where(eq(members.id, member.id));
  return NextResponse.json({ ok: true });
}
