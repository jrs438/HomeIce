import { db } from "@/db";
import { getSetting } from "@/lib/settings";
import { getCurrentMember } from "@/lib/auth";
import { cleanupCheckedGroceryItems } from "@/lib/cleanup";
import { ShopClient } from "@/components/shop/shop-client";

export default async function ShopPage() {
  await cleanupCheckedGroceryItems();

  const [storesJson, items, member] = await Promise.all([
    getSetting("grocery_stores"),
    db.query.groceryItems.findMany({ orderBy: (g, { asc }) => [asc(g.store), asc(g.createdAt)] }),
    getCurrentMember(),
  ]);

  const stores: string[] = JSON.parse(storesJson);

  return (
    <ShopClient
      stores={stores}
      initialItems={items.map((i) => ({ ...i, doneAt: i.doneAt ? i.doneAt.toISOString() : null }))}
      currentMemberName={member?.name ?? null}
    />
  );
}
