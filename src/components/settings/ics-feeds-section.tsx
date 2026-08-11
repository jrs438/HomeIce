"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Car } from "lucide-react";

type Kid = { id: string; name: string; color: string };
type IcsFeed = {
  id: string;
  url: string;
  label: string;
  kind: "events" | "busy";
  kidIds: string[];
  needsDropoff: boolean;
  needsPickup: boolean;
  active: boolean;
};

type FeedDraft = Omit<IcsFeed, "id" | "active">;

export function IcsFeedsSection({
  initial,
  kids,
  isAdmin,
}: {
  initial: IcsFeed[];
  kids: Kid[];
  isAdmin: boolean;
}) {
  const [feeds, setFeeds] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function create(draft: FeedDraft) {
    const res = await fetch("/api/ics-feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const created = await res.json();
      setFeeds((prev) => [...prev, created]);
    }
    setAdding(false);
  }

  async function save(id: string, draft: FeedDraft) {
    const res = await fetch(`/api/ics-feeds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const updated = await res.json();
      setFeeds((prev) => prev.map((f) => (f.id === id ? updated : f)));
    }
    setEditingId(null);
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
        {feeds.map((f) =>
          editingId === f.id ? (
            <FeedForm key={f.id} initial={f} kids={kids} onCancel={() => setEditingId(null)} onSubmit={(draft) => save(f.id, draft)} />
          ) : (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                  {f.kind === "busy" ? "Busy overlay" : "Events"}
                  {f.kind !== "busy" && (f.needsDropoff || f.needsPickup) && (
                    <>
                      {" · "}
                      <Car size={11} className="inline -mt-0.5" />{" "}
                      {[f.needsDropoff && "drop-off", f.needsPickup && "pick-up"].filter(Boolean).join(" + ")} needed
                    </>
                  )}
                </p>
                {f.kind !== "busy" && f.kidIds.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {f.kidIds.map((kidId) => {
                      const kid = kids.find((k) => k.id === kidId);
                      if (!kid) return null;
                      return (
                        <span
                          key={kidId}
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                          style={{ background: kid.color }}
                        >
                          {kid.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditingId(f.id)} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => remove(f.id)} className="rounded p-1.5" style={{ color: "var(--danger)" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </li>
          )
        )}
      </ul>

      {adding && (
        <FeedForm
          initial={{ url: "", label: "", kind: "events", kidIds: [], needsDropoff: false, needsPickup: false }}
          kids={kids}
          onCancel={() => setAdding(false)}
          onSubmit={create}
        />
      )}
    </section>
  );
}

function FeedForm({
  initial,
  kids,
  onCancel,
  onSubmit,
}: {
  initial: FeedDraft;
  kids: Kid[];
  onCancel: () => void;
  onSubmit: (draft: FeedDraft) => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [url, setUrl] = useState(initial.url);
  const [kind, setKind] = useState<"events" | "busy">(initial.kind);
  const [kidIds, setKidIds] = useState<string[]>(initial.kidIds);
  const [needsDropoff, setNeedsDropoff] = useState(initial.needsDropoff);
  const [needsPickup, setNeedsPickup] = useState(initial.needsPickup);

  function toggleKid(id: string) {
    setKidIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--accent)", background: "var(--bg-panel)" }}>
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

      {kind === "events" && kids.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            Whose calendar is this?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {kids.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => toggleKid(k.id)}
                className="rounded-full border px-2.5 py-1 text-xs font-medium"
                style={{
                  borderColor: k.color,
                  background: kidIds.includes(k.id) ? k.color : "transparent",
                  color: kidIds.includes(k.id) ? "#fff" : k.color,
                }}
              >
                {k.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {kind === "events" && (
        <div className="rounded-md border p-2" style={{ borderColor: "var(--border)" }}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Rides
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={needsDropoff} onChange={(e) => setNeedsDropoff(e.target.checked)} />
            Create an unassigned drop-off ride for each new event
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={needsPickup} onChange={(e) => setNeedsPickup(e.target.checked)} />
            Create an unassigned pick-up ride for each new event
          </label>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Leave both off for calendars that are just informational (test/exam schedules, etc.) — no ride needed.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onSubmit({ label, url, kind, kidIds, needsDropoff, needsPickup })}
          disabled={!label || !url}
          className="rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          Save
        </button>
        <button onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm" style={{ borderColor: "var(--border)" }}>
          Cancel
        </button>
      </div>
    </li>
  );
}
