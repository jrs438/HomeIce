"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { MemberLite } from "@/components/events/types";
import { WEEKDAY_LABELS, ymd } from "@/lib/dates";
import type { EventRuleRecord } from "@/components/rides/types";

const INTERVAL_LABELS: Record<number, string> = {
  1: "Every week",
  2: "Every 2 weeks",
  3: "Every 3 weeks",
  4: "Every 4 weeks",
};

export function EventRulesEditor({
  rules,
  members,
  onClose,
  onChange,
}: {
  rules: EventRuleRecord[];
  members: MemberLite[];
  onClose: () => void;
  onChange: (rules: EventRuleRecord[]) => void;
}) {
  const [editing, setEditing] = useState<EventRuleRecord | "new" | null>(null);
  const kids = members.filter((m) => m.role === "kid");

  async function remove(id: string) {
    if (!confirm("Delete this recurring event? Already-added occurrences stay on the calendar; only future ones stop.")) return;
    const res = await fetch(`/api/event-rules/${id}`, { method: "DELETE" });
    if (res.ok) onChange(rules.filter((r) => r.id !== id));
  }

  function upsert(rule: EventRuleRecord) {
    const exists = rules.some((r) => r.id === rule.id);
    onChange(exists ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule]);
    setEditing(null);
  }

  return (
    <Modal title="Recurring events" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setEditing("new")}
          className="flex items-center justify-center gap-1 self-start rounded-md border px-2.5 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--border)" }}
        >
          <Plus size={14} /> New recurring event
        </button>

        {rules.length === 0 && !editing && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No recurring events yet.
          </p>
        )}

        {rules.map((rule) =>
          editing !== "new" && editing?.id === rule.id ? (
            <EventRuleForm key={rule.id} initial={rule} kids={kids} onCancel={() => setEditing(null)} onSaved={upsert} />
          ) : (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)", background: "var(--bg-panel)", opacity: rule.active ? 1 : 0.5 }}
            >
              <div>
                <p className="text-sm font-semibold">
                  {WEEKDAY_LABELS[rule.dayOfWeek]} · {INTERVAL_LABELS[rule.intervalWeeks] ?? `Every ${rule.intervalWeeks} weeks`} · {rule.title}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {rule.startTime.slice(0, 5)}
                  {rule.endTime ? `–${rule.endTime.slice(0, 5)}` : ""} {rule.location ? `@ ${rule.location}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(rule)} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(rule.id)} className="rounded p-1.5" style={{ color: "var(--danger)" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )
        )}

        {editing === "new" && <EventRuleForm kids={kids} onCancel={() => setEditing(null)} onSaved={upsert} />}
      </div>
    </Modal>
  );
}

function EventRuleForm({
  initial,
  kids,
  onCancel,
  onSaved,
}: {
  initial?: EventRuleRecord;
  kids: MemberLite[];
  onCancel: () => void;
  onSaved: (rule: EventRuleRecord) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(initial?.dayOfWeek ?? 4);
  const [intervalWeeks, setIntervalWeeks] = useState(initial?.intervalWeeks ?? 1);
  const [anchorDate, setAnchorDate] = useState(initial?.anchorDate ?? ymd(new Date()));
  const [startTime, setStartTime] = useState(initial?.startTime?.slice(0, 5) ?? "17:00");
  const [endTime, setEndTime] = useState(initial?.endTime?.slice(0, 5) ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [kidIds, setKidIds] = useState<string[]>(initial?.kidIds ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  const [needsDropoff, setNeedsDropoff] = useState(false);
  const [dropoffFrom, setDropoffFrom] = useState("Home");
  const [dropoffTo, setDropoffTo] = useState(initial?.location ?? "");
  const [needsPickup, setNeedsPickup] = useState(false);
  const [pickupFrom, setPickupFrom] = useState(initial?.location ?? "");
  const [pickupTo, setPickupTo] = useState("Home");

  const [saving, setSaving] = useState(false);

  function toggleKid(id: string) {
    setKidIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        title,
        dayOfWeek,
        intervalWeeks,
        anchorDate,
        startTime,
        endTime: endTime || null,
        location: location || null,
        kidIds,
        notes: notes || null,
        active,
        ...(!initial && needsDropoff ? { needsDropoff, dropoffFrom, dropoffTo } : {}),
        ...(!initial && needsPickup ? { needsPickup, pickupFrom, pickupTo } : {}),
      };
      const res = await fetch(initial ? `/api/event-rules/${initial.id}` : "/api/event-rules", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) onSaved(await res.json());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--accent)", background: "var(--bg-panel)" }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Emma gymnastics)"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      <div className="flex gap-2">
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="flex-1 rounded-md border px-2 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          {WEEKDAY_LABELS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={intervalWeeks}
          onChange={(e) => setIntervalWeeks(Number(e.target.value))}
          className="flex-1 rounded-md border px-2 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {INTERVAL_LABELS[n]}
            </option>
          ))}
        </select>
      </div>
      {intervalWeeks > 1 && (
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Starting the week of
          <input
            type="date"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
        </label>
      )}
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Start time
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          End time (optional)
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
        </label>
      </div>
      <input
        value={location}
        onChange={(e) => {
          setLocation(e.target.value);
          if (!dropoffTo) setDropoffTo(e.target.value);
          if (!pickupFrom) setPickupFrom(e.target.value);
        }}
        placeholder="Location (optional)"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
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
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />

      {!initial && kidIds.length > 0 && (
        <div className="rounded-md border p-2" style={{ borderColor: "var(--border)" }}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Rides (recurring, same schedule)
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={needsDropoff} onChange={(e) => setNeedsDropoff(e.target.checked)} />
            Needs a drop-off ride
          </label>
          {needsDropoff && (
            <div className="mt-1.5 mb-2 flex gap-1.5 pl-6">
              <input
                value={dropoffFrom}
                onChange={(e) => setDropoffFrom(e.target.value)}
                placeholder="From"
                className="w-0 flex-1 rounded-md border px-2 py-1.5 text-xs"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
              <input
                value={dropoffTo}
                onChange={(e) => setDropoffTo(e.target.value)}
                placeholder="To"
                className="w-0 flex-1 rounded-md border px-2 py-1.5 text-xs"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={needsPickup} onChange={(e) => setNeedsPickup(e.target.checked)} />
            Needs a pick-up ride
          </label>
          {needsPickup && (
            <div className="mt-1.5 flex gap-1.5 pl-6">
              <input
                value={pickupFrom}
                onChange={(e) => setPickupFrom(e.target.value)}
                placeholder="From"
                className="w-0 flex-1 rounded-md border px-2 py-1.5 text-xs"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
              <input
                value={pickupTo}
                onChange={(e) => setPickupTo(e.target.value)}
                placeholder="To"
                className="w-0 flex-1 rounded-md border px-2 py-1.5 text-xs"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
            </div>
          )}
        </div>
      )}

      {initial && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      )}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !title || !startTime}
          className="rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          Save
        </button>
        <button onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm" style={{ borderColor: "var(--border)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
