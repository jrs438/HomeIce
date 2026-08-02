"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { addDays, startOfDay, startOfWeek, ymd, MONTH_LABELS } from "@/lib/dates";

type Member = { id: string; name: string; color: string; role: "parent" | "kid" | "sitter" };

type SitterShift = {
  id: string;
  sitterId: string | null;
  date: string;
  hours: string;
  rate: string | null;
  notes: string | null;
  paid: boolean;
};

type Reimbursement = {
  id: string;
  memberId: string | null;
  date: string;
  amount: string;
  store: string | null;
  notes: string | null;
  reimbursed: boolean;
};

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function nameFor(members: Member[], id: string | null): string {
  return members.find((m) => m.id === id)?.name ?? "—";
}

export function MoneyClient({
  members,
  initialShifts,
  initialReimbursements,
  currentMemberId,
}: {
  members: Member[];
  initialShifts: SitterShift[];
  initialReimbursements: Reimbursement[];
  currentMemberId: string | null;
}) {
  const [anchor, setAnchor] = useState(() => startOfWeek(startOfDay(new Date())));
  const [shifts, setShifts] = useState(initialShifts);
  const [reimbursements, setReimbursements] = useState(initialReimbursements);

  const sitters = members.filter((m) => m.role === "sitter");
  const weekStart = ymd(anchor);
  const weekEnd = ymd(addDays(anchor, 6));

  const weekShifts = useMemo(
    () => shifts.filter((s) => s.date >= weekStart && s.date <= weekEnd),
    [shifts, weekStart, weekEnd]
  );
  const weekReimbursements = useMemo(
    () => reimbursements.filter((r) => r.date >= weekStart && r.date <= weekEnd),
    [reimbursements, weekStart, weekEnd]
  );

  const weekHours = weekShifts.reduce((sum, s) => sum + Number(s.hours), 0);
  const weekPay = weekShifts.reduce((sum, s) => sum + Number(s.hours) * Number(s.rate ?? 0), 0);
  const weekReimbTotal = weekReimbursements.reduce((sum, r) => sum + Number(r.amount), 0);

  // --- shift form ---
  const [shiftDate, setShiftDate] = useState(ymd(new Date()));
  const [shiftSitterId, setShiftSitterId] = useState<string>(sitters[0]?.id ?? "");
  const [shiftHours, setShiftHours] = useState("");
  const [shiftRate, setShiftRate] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");

  async function addShift() {
    const hours = Number(shiftHours);
    if (!shiftDate || !hours) return;
    const res = await fetch("/api/sitter-shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sitterId: shiftSitterId || null,
        date: shiftDate,
        hours,
        rate: shiftRate || null,
        notes: shiftNotes || null,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setShifts((prev) => [created, ...prev]);
      setShiftHours("");
      setShiftNotes("");
    }
  }

  async function toggleShiftPaid(shift: SitterShift) {
    const res = await fetch(`/api/sitter-shifts/${shift.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !shift.paid }),
    });
    if (res.ok) {
      const updated = await res.json();
      setShifts((prev) => prev.map((s) => (s.id === shift.id ? updated : s)));
    }
  }

  async function removeShift(id: string) {
    const res = await fetch(`/api/sitter-shifts/${id}`, { method: "DELETE" });
    if (res.ok) setShifts((prev) => prev.filter((s) => s.id !== id));
  }

  // --- reimbursement form ---
  const [reimbDate, setReimbDate] = useState(ymd(new Date()));
  const [reimbMemberId, setReimbMemberId] = useState<string>(currentMemberId ?? members[0]?.id ?? "");
  const [reimbAmount, setReimbAmount] = useState("");
  const [reimbStore, setReimbStore] = useState("");
  const [reimbNotes, setReimbNotes] = useState("");

  async function addReimbursement() {
    const amount = Number(reimbAmount);
    if (!reimbDate || !amount) return;
    const res = await fetch("/api/reimbursements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: reimbMemberId || null,
        date: reimbDate,
        amount,
        store: reimbStore || null,
        notes: reimbNotes || null,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setReimbursements((prev) => [created, ...prev]);
      setReimbAmount("");
      setReimbStore("");
      setReimbNotes("");
    }
  }

  async function toggleReimbursed(r: Reimbursement) {
    const res = await fetch(`/api/reimbursements/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reimbursed: !r.reimbursed }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReimbursements((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    }
  }

  async function removeReimbursement(id: string) {
    const res = await fetch(`/api/reimbursements/${id}`, { method: "DELETE" });
    if (res.ok) setReimbursements((prev) => prev.filter((r) => r.id !== id));
  }

  const inputCls = "rounded-md border px-2.5 py-1.5 text-sm";
  const inputStyle = { borderColor: "var(--border)", background: "var(--bg-panel)" };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-5">
      <h1 className="masthead text-xl">MONEY</h1>

      <div className="flex items-center justify-between">
        <button onClick={() => setAnchor((a) => addDays(a, -7))} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={20} />
        </button>
        <p className="text-sm font-semibold">
          {MONTH_LABELS[anchor.getMonth()]} {anchor.getDate()} – {MONTH_LABELS[addDays(anchor, 6).getMonth()]}{" "}
          {addDays(anchor, 6).getDate()}
        </p>
        <button onClick={() => setAnchor((a) => addDays(a, 7))} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ---------- Babysitter hours ---------- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="rink-label text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            Babysitter Hours
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {weekHours.toFixed(2)} hrs{weekPay > 0 ? ` · ${money(weekPay)} owed` : ""}
          </p>
        </div>

        {sitters.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            No sitter set up yet — add one in Settings (member role: Sitter).
          </p>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} className={inputCls} style={inputStyle} />
              <select value={shiftSitterId} onChange={(e) => setShiftSitterId(e.target.value)} className={inputCls} style={inputStyle}>
                {sitters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.25"
                min="0"
                placeholder="Hours"
                value={shiftHours}
                onChange={(e) => setShiftHours(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Rate ($/hr, optional)"
                value={shiftRate}
                onChange={(e) => setShiftRate(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
            <button
              onClick={addShift}
              className="flex items-center justify-center gap-1 self-start rounded-md border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: "var(--border)" }}
            >
              <Plus size={14} /> Log hours
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {weekShifts.length === 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No hours logged this week.
            </p>
          )}
          {weekShifts.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-md border p-2.5 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <input type="checkbox" checked={s.paid} onChange={() => toggleShiftPaid(s)} className="h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className={s.paid ? "line-through" : ""} style={{ color: s.paid ? "var(--text-muted)" : "var(--text)" }}>
                  {s.date} · {nameFor(members, s.sitterId)} · {Number(s.hours).toFixed(2)} hrs
                  {s.rate ? ` · ${money(Number(s.hours) * Number(s.rate))}` : ""}
                </p>
                {s.notes && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {s.notes}
                  </p>
                )}
              </div>
              <button onClick={() => removeShift(s.id)} style={{ color: "var(--text-muted)" }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Reimbursements ---------- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="rink-label text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            Shopping Reimbursements
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {weekReimbTotal > 0 ? money(weekReimbTotal) : "—"}
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={reimbDate} onChange={(e) => setReimbDate(e.target.value)} className={inputCls} style={inputStyle} />
            <select value={reimbMemberId} onChange={(e) => setReimbMemberId(e.target.value)} className={inputCls} style={inputStyle}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount ($)"
              value={reimbAmount}
              onChange={(e) => setReimbAmount(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Store"
              value={reimbStore}
              onChange={(e) => setReimbStore(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={reimbNotes}
            onChange={(e) => setReimbNotes(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
          <button
            onClick={addReimbursement}
            className="flex items-center justify-center gap-1 self-start rounded-md border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--border)" }}
          >
            <Plus size={14} /> Log receipt
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {weekReimbursements.length === 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No receipts logged this week.
            </p>
          )}
          {weekReimbursements.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-md border p-2.5 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <input type="checkbox" checked={r.reimbursed} onChange={() => toggleReimbursed(r)} className="h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className={r.reimbursed ? "line-through" : ""} style={{ color: r.reimbursed ? "var(--text-muted)" : "var(--text)" }}>
                  {r.date} · {nameFor(members, r.memberId)} · {money(Number(r.amount))}
                  {r.store ? ` · ${r.store}` : ""}
                </p>
                {r.notes && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {r.notes}
                  </p>
                )}
              </div>
              <button onClick={() => removeReimbursement(r.id)} style={{ color: "var(--text-muted)" }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
