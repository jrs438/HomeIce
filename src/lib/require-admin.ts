import { NextResponse } from "next/server";
import { getCurrentMember } from "./auth";

export async function requireAdmin() {
  const member = await getCurrentMember();
  if (!member) {
    return { member: null, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  if (!member.isAdmin) {
    return { member, response: NextResponse.json({ error: "Admins only" }, { status: 403 }) };
  }
  return { member, response: null };
}
