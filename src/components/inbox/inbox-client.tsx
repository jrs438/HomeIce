"use client";

import { useState } from "react";
import { Check, X, Mail, Camera, MessageSquare } from "lucide-react";

type InboxItem = {
  id: string;
  source: "email" | "capture_image" | "capture_text";
  raw: string;
  parsedActions: { type: string; note?: string }[];
  status: "pending" | "approved" | "dismissed";
  fromLabel: string | null;
  createdAt: string;
};

const SOURCE_ICON = { email: Mail, capture_image: Camera, capture_text: MessageSquare };

export function InboxClient({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = useState(initialItems);
  const pending = items.filter((i) => i.status === "pending");
  const resolved = items.filter((i) => i.status !== "pending");

  async function act(id: string, action: "approve" | "dismiss") {
    const res = await fetch(`/api/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: action === "approve" ? "approved" : "dismissed" } : i))
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-5">
      <div>
        <h1 className="masthead text-xl">INBOX</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Anything the capture pipeline couldn&apos;t confidently apply.
        </p>
      </div>

      {pending.length === 0 && (
        <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Nothing pending.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {pending.map((item) => {
          const Icon = SOURCE_ICON[item.source];
          return (
            <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <Icon size={14} />
                {item.fromLabel && <span>{item.fromLabel}</span>}
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{item.raw}</p>
              {item.parsedActions.length > 0 && (
                <ul className="flex flex-col gap-1 rounded-md border p-2 text-xs" style={{ borderColor: "var(--border)" }}>
                  {item.parsedActions.map((a, i) => (
                    <li key={i} style={{ color: "var(--text-muted)" }}>
                      {a.type === "unknown" ? a.note || "Couldn't parse this" : `${a.type}`}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => act(item.id, "approve")}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                >
                  <Check size={13} /> Approve
                </button>
                <button
                  onClick={() => act(item.id, "dismiss")}
                  className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: "var(--border)" }}
                >
                  <X size={13} /> Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {resolved.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Resolved
          </h2>
          {resolved.slice(0, 10).map((item) => (
            <div key={item.id} className="rounded-md border px-3 py-2 text-xs opacity-60" style={{ borderColor: "var(--border)" }}>
              <span className="font-semibold">{item.status}</span> · {item.raw.slice(0, 80)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
