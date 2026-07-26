import { db } from "@/db";
import { groceryItems } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";

const CLEAR_AFTER_MS = 48 * 60 * 60 * 1000;

export async function cleanupCheckedGroceryItems() {
  const cutoff = new Date(Date.now() - CLEAR_AFTER_MS);
  await db.delete(groceryItems).where(and(eq(groceryItems.done, true), lt(groceryItems.doneAt, cutoff)));
}
