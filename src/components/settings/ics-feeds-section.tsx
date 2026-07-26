"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type IcsFeed = { id: string; url: string; label: string; kind: "events" | "busy"; active: boolean };

export function IcsFeedsSection({ initial, isAdmin }: { initial: IcsFeed[]; isAdmin: boolean }) {
  const [feeds, setFeeds] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"events" | "busy">("events");

  async function create() {
    const res = await fetch("/api/ics-feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url, kind }),
    });
    if (res.ok) {
      const created = await res.json();
      setFeeds((prev) => [...prev, created]);
      setLabel("");
      setUrl("");
      setAdding(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/ics-feeds/${id}`, { method: "DELETE" });
    if (res.ok) setFeeds((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Calendar feeds (ICS)
        </h2>
        {isAdmin && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium"
            style={{ borderColor: "var(--border)" }}
          >
            <Plus size={14} /> Add
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {feeds.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
          >
            <div>
              <p className="text-sm font-semibold">{f.label}</p>
              <p className="truncate text-xs" style={{ color: "var(--text-muted)", maxWidth: 220 }}>
                {f.kind === "busy" ? "Busy overlay · " : ""}
                {f.url}
              </p>
            </div>
            {isAdmin && (
              <button onClick={() => remove(f.id)} className="rounded p-1.5" style={{ color: "var(--danger)" }}>
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--accent)", background: "var(--bg-panel)" }}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Jonah's school calendar)"
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="ICS feed URL"
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "events" | "busy")}
            className="rounded-md border px-2 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <option value="events">Events feed</option>
            <option value="busy">Busy overlay only (e.g. Outlook availability)</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={!label || !url}
              className="rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              Save
            </button>
            <button onClick={() => setAdding(false)} className="rounded-md border px-3 py-1.5 text-sm" style={{ borderColor: "var(--border)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
