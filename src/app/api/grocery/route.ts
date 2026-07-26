import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groceryItems } from "@/db/schema";
import { cleanupCheckedGroceryItems } from "@/lib/cleanup";

export async function GET() {
  await cleanupCheckedGroceryItems();
  const all = await db.query.groceryItems.findMany({
    orderBy: (g, { asc }) => [asc(g.store), asc(g.createdAt)],
  });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.store || !body.item) {
    return NextResponse.json({ error: "store and item are required" }, { status: 400 });
  }
  const [created] = await db
    .insert(groceryItems)
    .values({ store: body.store, item: body.item, addedBy: body.addedBy || null })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
