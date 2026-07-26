import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { createPasswordProofCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password) {
    return NextResponse.json({ ok: false, error: "Password required" }, { status: 400 });
  }
  const expected = await getSetting("family_password");
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }
  await createPasswordProofCookie();
  return NextResponse.json({ ok: true });
}
