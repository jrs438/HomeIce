import { NextResponse } from "next/server";
import { hasPasswordProof } from "@/lib/auth";
import { db } from "@/db";

export async function GET() {
  if (!(await hasPasswordProof())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const all = await db.query.members.findMany();
  return NextResponse.json(
    all.map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color }))
  );
}
