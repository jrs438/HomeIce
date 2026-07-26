"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { MemberLite } from "@/components/events/types";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { RIDE_KIND_LABELS, type ExternalDriverRecord, type RideRuleRecord } from "./types";

export function RulesEditor({
  rules,
  members,
  externalDrivers,
  onClose,
  onChange,
}: {
  rules: RideRuleRecord[];
  members: MemberLite[];
  externalDrivers: ExternalDriverRecord[];
  onClose: () => void;
  onChange: (rules: RideRuleRecord[]) => void;
}) {
  const [editing, setEditing] = useState<RideRuleRecord | "new" | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this default?")) return;
    const res = await fetch(`/api/ride-rules/${id}`, { method: "DELETE" });
    if (res.ok) onChange(rules.filter((r) => r.id !== id));
  }

  function upsert(rule: RideRuleRecord) {
    const exists = rules.some((r) => r.id === rule.id);
    onChange(exists ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule]);
    setEditing(null);
  }

  const kids = members.filter((m) => m.role === "kid");

  return (
    <Modal title="Ride defaults" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setEditing("new")}
          className="flex items-center justify-center gap-1 self-start rounded-md border px-2.5 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--border)" }}
        >
          <Plus size={14} /> New default
        </button>

        {rules.length === 0 && !editing && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No recurring ride defaults yet.
          </p>
        )}

        {rules.map((rule) =>
          editing !== "new" && editing?.id === rule.id ? (
            <RuleForm
              key={rule.id}
              initial={rule}
              kids={kids}
              members={members}
              externalDrivers={externalDrivers}
              onCancel={() => setEditing(null)}
              onSaved={upsert}
            />
          ) : (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
            >
              <div>
                <p className="text-sm font-semibold">
                  {WEEKDAY_LABELS[rule.dayOfWeek]} · {RIDE_KIND_LABELS[rule.kind]} · {rule.label}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {rule.from} → {rule.to} {rule.time ? `at ${rule.time}` : "(no time set)"}
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

        {editing === "new" && (
          <RuleForm kids={kids} members={members} externalDrivers={externalDrivers} onCancel={() => setEditing(null)} onSaved={upsert} />
        )}
      </div>
    </Modal>
  );
}

function RuleForm({
  initial,
  kids,
  members,
  externalDrivers,
  onCancel,
  onSaved,
}: {
  initial?: RideRuleRecord;
  kids: MemberLite[];
  members: MemberLite[];
  externalDrivers: ExternalDriverRecord[];
  onCancel: () => void;
  onSaved: (rule: RideRuleRecord) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(initial?.dayOfWeek ?? 3);
  const [kind, setKind] = useState<RideRuleRecord["kind"]>(initial?.kind ?? "activity_pickup");
  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [time, setTime] = useState(initial?.time ?? "15:30");
  const [kidIds, setKidIds] = useState<string[]>(initial?.kidIds ?? []);
  const [driverType, setDriverType] = useState<RideRuleRecord["driverType"]>(initial?.driverType ?? "unassigned");
  const [driverId, setDriverId] = useState<string | null>(initial?.driverId ?? null);
  const [saving, setSaving] = useState(false);

  function toggleKid(id: string) {
    setKidIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { label, dayOfWeek, kind, from, to, time, kidIds, driverType, driverId };
      const res = await fetch(initial ? `/api/ride-rules/${initial.id}` : "/api/ride-rules", {
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
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. Wed dance pickup)"
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
          value={kind}
          onChange={(e) => setKind(e.target.value as RideRuleRecord["kind"])}
          className="flex-1 rounded-md border px-2 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          <option value="activity_dropoff">Drop-off</option>
          <option value="activity_pickup">Pickup</option>
          <option value="school_pickup">School pickup</option>
        </select>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-28 rounded-md border px-2 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />
      </div>
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
      <select
        value={driverType === "unassigned" ? "unassigned" : driverType === "carpool" ? "carpool" : `${driverType}:${driverId}`}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "unassigned" || v === "carpool") {
            setDriverType(v);
            setDriverId(null);
          } else {
            const [t, id] = v.split(":");
            setDriverType(t as RideRuleRecord["driverType"]);
            setDriverId(id);
          }
        }}
        className="rounded-md border px-2 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <option value="unassigned">Unassigned</option>
        <option value="carpool">Carpool</option>
        <optgroup label="Family">
          {members.map((m) => (
            <option key={m.id} value={`member:${m.id}`}>
              {m.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="External">
          {externalDrivers.map((d) => (
            <option key={d.id} value={`external:${d.id}`}>
              {d.label}
            </option>
          ))}
        </optgroup>
      </select>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !label || !from || !to}
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
