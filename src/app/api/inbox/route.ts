import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET() {
  const all = await db.query.inboxItems.findMany({ orderBy: (i, { desc }) => desc(i.createdAt) });
  return NextResponse.json(all);
}
