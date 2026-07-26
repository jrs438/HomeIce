"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";

type GroceryItem = {
  id: string;
  store: string;
  item: string;
  addedBy: string | null;
  done: boolean;
  doneAt: string | null;
};

export function ShopClient({
  stores,
  initialItems,
  currentMemberName,
}: {
  stores: string[];
  initialItems: GroceryItem[];
  currentMemberName: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [store, setStore] = useState(stores[0] ?? "");
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);

  const countsByStore = stores.reduce<Record<string, number>>((acc, s) => {
    acc[s] = items.filter((i) => i.store === s && !i.done).length;
    return acc;
  }, {});

  const storeItems = items
    .filter((i) => i.store === store)
    .sort((a, b) => Number(a.done) - Number(b.done));

  async function addItem() {
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, item: newItem.trim(), addedBy: currentMemberName }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        setNewItem("");
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggle(item: GroceryItem) {
    const res = await fetch(`/api/grocery/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-5">
      <h1 className="masthead text-xl">SHOP</h1>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {stores.map((s) => (
          <button
            key={s}
            onClick={() => setStore(s)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold"
            style={{
              borderColor: store === s ? "var(--accent)" : "var(--border)",
              background: store === s ? "var(--accent)" : "transparent",
              color: store === s ? "var(--accent-text)" : "var(--text)",
            }}
          >
            {s}
            {countsByStore[s] > 0 && (
              <span
                className="rounded-full px-1.5 text-[11px] font-bold"
                style={{
                  background: store === s ? "var(--accent-text)" : "var(--tile-bg)",
                  color: store === s ? "var(--accent)" : "var(--tile-fg)",
                }}
              >
                {countsByStore[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder={`Add to ${store}…`}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
        />
        <button
          onClick={addItem}
          disabled={adding || !newItem.trim()}
          className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {storeItems.length === 0 && (
          <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Nothing on the {store} list.
          </p>
        )}
        {storeItems.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item)}
            className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)", opacity: item.done ? 0.55 : 1 }}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
              style={{
                borderColor: item.done ? "var(--success)" : "var(--border)",
                background: item.done ? "var(--success)" : "transparent",
              }}
            >
              {item.done && <Check size={13} color="#fff" />}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium"
                style={{ textDecoration: item.done ? "line-through" : "none" }}
              >
                {item.item}
              </p>
              {item.addedBy && (
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  added by {item.addedBy}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
