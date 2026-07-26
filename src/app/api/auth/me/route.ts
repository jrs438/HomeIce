import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";

export async function GET() {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ member: null });
  return NextResponse.json({
    member: {
      id: member.id,
      name: member.name,
      role: member.role,
      color: member.color,
      isAdmin: member.isAdmin,
    },
  });
}
