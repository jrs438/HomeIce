"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import type { MemberLite } from "@/components/events/types";
import { ymd } from "@/lib/dates";
import type { RideRecord } from "./types";

export function RideModal({
  members,
  defaultDate,
  onClose,
  onSaved,
}: {
  members: MemberLite[];
  defaultDate: Date;
  onClose: () => void;
  onSaved: (ride: RideRecord) => void;
}) {
  const [date, setDate] = useState(ymd(defaultDate));
  const [time, setTime] = useState("15:30");
  const [kind, setKind] = useState<RideRecord["kind"]>("activity_pickup");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kidIds, setKidIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kids = members.filter((m) => m.role === "kid");

  function toggleKid(id: string) {
    setKidIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  }

  async function save() {
    if (!from.trim() || !to.trim()) {
      setError("From and to are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, kind, from: from.trim(), to: to.trim(), kidIds }),
      });
      if (!res.ok) {
        setError("Could not save ride");
        return;
      }
      onSaved(await res.json());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add ride" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Time
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as RideRecord["kind"])}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <option value="activity_dropoff">Activity drop-off</option>
            <option value="activity_pickup">Activity pickup</option>
            <option value="school_pickup">School pickup</option>
          </select>
        </label>

        <div className="flex gap-2">
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
        </div>

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

        {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          {saving ? "Saving…" : "Save ride"}
        </button>
      </div>
    </Modal>
  );
}
