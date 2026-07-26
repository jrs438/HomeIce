"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import type { EventRecord, MemberLite } from "./types";

function toLocalInput(dt: string | null, allDay: boolean): string {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (allDay) return date;
  return `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventModal({
  initial,
  members,
  defaultDate,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial?: EventRecord;
  members: MemberLite[];
  defaultDate?: Date;
  onClose: () => void;
  onSaved: (event: EventRecord) => void;
  onDeleted?: (id: string) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  const [start, setStart] = useState(
    initial ? toLocalInput(initial.start, initial.allDay) : toLocalInput((defaultDate ?? new Date()).toISOString(), allDay)
  );
  const [end, setEnd] = useState(initial?.end ? toLocalInput(initial.end, initial.allDay) : "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [kidIds, setKidIds] = useState<string[]>(initial?.kidIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kids = members.filter((m) => m.role === "kid");

  function toggleKid(id: string) {
    setKidIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  }

  async function save() {
    if (!title.trim() || !start) {
      setError("Title and start are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        start: allDay ? new Date(`${start}T00:00:00`).toISOString() : new Date(start).toISOString(),
        end: end ? (allDay ? new Date(`${end}T23:59:59`).toISOString() : new Date(end).toISOString()) : null,
        allDay,
        location: location.trim() || null,
        kidIds,
        notes: notes.trim() || null,
      };
      const res = await fetch(initial ? `/api/events/${initial.id}` : "/api/events", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError("Could not save event");
        return;
      }
      const saved = await res.json();
      onSaved(saved);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function cancelEvent() {
    if (!initial) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        const saved = await res.json();
        onSaved(saved);
        onDeleted?.(initial.id);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? "Edit event" : "Add event"} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Jonah hockey practice)"
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          All day
        </label>

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Start
            <input
              type={allDay ? "date" : "datetime-local"}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            End (optional)
            <input
              type={allDay ? "date" : "datetime-local"}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
        </div>

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />

        <div>
          <p className="mb-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Kids
          </p>
          <div className="flex flex-wrap gap-1.5">
            {kids.map((k) => (
              <button
                key={k.id}
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

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />

        {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {initial && initial.status !== "cancelled" && (
            <button
              onClick={cancelEvent}
              disabled={saving}
              className="rounded-md border px-3 py-2 text-sm font-medium"
              style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
            >
              Cancel event
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
