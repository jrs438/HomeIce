"use client";

import { useState } from "react";
import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";

type Kid = { id: string; name: string; color: string };
type Chore = {
  id: string;
  memberId: string | null;
  title: string;
  cadence: string;
  done: boolean;
  week: string;
  points: number;
};

export function JobsClient({
  week,
  kids,
  initialChores,
}: {
  week: string;
  kids: Kid[];
  initialChores: Chore[];
}) {
  const [choresList, setChoresList] = useState(initialChores);
  const [newTitle, setNewTitle] = useState<Record<string, string>>({});
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function addChore(kidId: string) {
    const title = (newTitle[kidId] ?? "").trim();
    if (!title) return;
    const res = await fetch("/api/chores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: kidId, title, week }),
    });
    if (res.ok) {
      const created = await res.json();
      setChoresList((prev) => [...prev, created]);
      setNewTitle((prev) => ({ ...prev, [kidId]: "" }));
    }
  }

  async function toggle(chore: Chore) {
    const res = await fetch(`/api/chores/${chore.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !chore.done }),
    });
    if (res.ok) {
      const updated = await res.json();
      setChoresList((prev) => prev.map((c) => (c.id === chore.id ? updated : c)));
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/chores/${id}`, { method: "DELETE" });
    if (res.ok) setChoresList((prev) => prev.filter((c) => c.id !== id));
  }

  async function resetWeek() {
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch("/api/chores/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromWeek: week }),
      });
      const data = await res.json();
      setResetMsg(
        data.created > 0
          ? `Rolled ${data.created} job${data.created === 1 ? "" : "s"} into next week.`
          : data.note ?? "Nothing to roll over yet."
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="masthead text-xl">JOBS</h1>
        <button
          onClick={resetWeek}
          disabled={resetting}
          className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          <RotateCcw size={14} /> {resetting ? "Rolling…" : "Roll to next week"}
        </button>
      </div>

      {resetMsg && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {resetMsg}
        </p>
      )}

      {kids.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No kids set up yet — add them in Settings.
        </p>
      )}

      {kids.map((kid) => {
        const kidChores = choresList.filter((c) => c.memberId === kid.id);
        return (
          <div key={kid.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: kid.color }}
              >
                {kid.name.slice(0, 1)}
              </span>
              <p className="text-sm font-semibold">{kid.name}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              {kidChores.length === 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  No jobs this week.
                </p>
              )}
              {kidChores.map((chore) => (
                <div
                  key={chore.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
                >
                  <button onClick={() => toggle(chore)} className="flex items-center gap-3 flex-1 text-left">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: chore.done ? "var(--success)" : "var(--border)",
                        background: chore.done ? "var(--success)" : "transparent",
                      }}
                    >
                      {chore.done && <Check size={13} color="#fff" />}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ textDecoration: chore.done ? "line-through" : "none" }}
                    >
                      {chore.title}
                    </span>
                  </button>
                  <button onClick={() => remove(chore.id)} className="rounded p-1" style={{ color: "var(--text-muted)" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={newTitle[kid.id] ?? ""}
                onChange={(e) => setNewTitle((prev) => ({ ...prev, [kid.id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addChore(kid.id)}
                placeholder={`Add a job for ${kid.name}…`}
                className="flex-1 rounded-md border px-3 py-1.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
              />
              <button
                onClick={() => addChore(kid.id)}
                className="flex items-center rounded-md px-2.5 py-1.5"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
