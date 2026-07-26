import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const all = await db.query.members.findMany({ orderBy: (m, { asc }) => asc(m.createdAt) });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json();
  const [created] = await db
    .insert(members)
    .values({
      name: body.name,
      role: body.role,
      color: body.color,
      isAdmin: !!body.isAdmin,
      emails: body.emails ?? [],
      inviteEmail: body.inviteEmail || null,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
