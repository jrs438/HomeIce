"use client";

import { useState } from "react";
import { Flame, Heart, Plus, ArrowRight } from "lucide-react";
import { addDays, ymd, WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/dates";

type DinnerMenuRow = { id: string; date: string; meal: string; requestedBy: string | null; isYomTov: boolean };
type DinnerRequest = { id: string; memberId: string | null; text: string; votes: string[] };
type MemberLite = { id: string; name: string; color: string };

export function EatClient({
  weekStartIso,
  initialMenu,
  initialRequests,
  members,
  currentMemberId,
  yomTovDates,
}: {
  weekStartIso: string;
  initialMenu: DinnerMenuRow[];
  initialRequests: DinnerRequest[];
  members: MemberLite[];
  currentMemberId: string | null;
  yomTovDates: string[];
}) {
  const yomTovSet = new Set(yomTovDates);
  const weekStart = new Date(weekStartIso);
  const [menu, setMenu] = useState(initialMenu);
  const [requests, setRequests] = useState(initialRequests);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [mealDraft, setMealDraft] = useState("");
  const [newRequest, setNewRequest] = useState("");
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function memberName(id: string | null) {
    return members.find((m) => m.id === id)?.name ?? null;
  }

  async function saveMeal(date: string) {
    if (!mealDraft.trim()) {
      setEditingDate(null);
      return;
    }
    const res = await fetch("/api/dinner-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, meal: mealDraft.trim() }),
    });
    if (res.ok) {
      const saved = await res.json();
      setMenu((prev) => {
        const exists = prev.some((m) => m.date === date);
        return exists ? prev.map((m) => (m.date === date ? saved : m)) : [...prev, saved];
      });
    }
    setEditingDate(null);
    setMealDraft("");
  }

  async function addRequest() {
    if (!newRequest.trim()) return;
    const res = await fetch("/api/dinner-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newRequest.trim(), memberId: currentMemberId }),
    });
    if (res.ok) {
      const created = await res.json();
      setRequests((prev) => [...prev, created]);
      setNewRequest("");
    }
  }

  async function toggleVote(req: DinnerRequest) {
    if (!currentMemberId) return;
    const res = await fetch(`/api/dinner-requests/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toggleVoteMemberId: currentMemberId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === req.id ? updated : r)));
    }
  }

  async function promote(req: DinnerRequest, date: string) {
    const res = await fetch("/api/dinner-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, meal: req.text, requestedBy: req.memberId }),
    });
    if (res.ok) {
      const saved = await res.json();
      setMenu((prev) => {
        const exists = prev.some((m) => m.date === date);
        return exists ? prev.map((m) => (m.date === date ? saved : m)) : [...prev, saved];
      });
      await fetch(`/api/dinner-requests/${req.id}`, { method: "DELETE" });
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    }
    setPromotingId(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-5">
      <h1 className="masthead text-xl">EAT</h1>

      <div className="flex flex-col gap-2">
        {days.map((day) => {
          const dateStr = ymd(day);
          const row = menu.find((m) => m.date === dateStr);
          const isShabbat = day.getDay() === 5;
          const isYomTov = row?.isYomTov || yomTovSet.has(dateStr);
          const editing = editingDate === dateStr;

          return (
            <div
              key={dateStr}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
              style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
            >
              <div className="w-24 shrink-0">
                <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  {WEEKDAY_LABELS[day.getDay()]} {MONTH_LABELS[day.getMonth()]} {day.getDate()}
                </p>
                {(isShabbat || isYomTov) && (
                  <p className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
                    <Flame size={11} /> {isYomTov ? "Yom Tov" : "Shabbat"}
                  </p>
                )}
              </div>
              {editing ? (
                <input
                  autoFocus
                  value={mealDraft}
                  onChange={(e) => setMealDraft(e.target.value)}
                  onBlur={() => saveMeal(dateStr)}
                  onKeyDown={(e) => e.key === "Enter" && saveMeal(dateStr)}
                  className="flex-1 rounded-md border px-2 py-1.5 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                />
              ) : (
                <button
                  onClick={() => {
                    setEditingDate(dateStr);
                    setMealDraft(row?.meal ?? "");
                  }}
                  className="flex-1 text-left text-sm"
                  style={{ color: row ? "var(--text)" : "var(--text-muted)" }}
                >
                  {row ? row.meal : "Tap to plan…"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Requests
        </h2>

        <div className="flex gap-2">
          <input
            value={newRequest}
            onChange={(e) => setNewRequest(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRequest()}
            placeholder="Request a meal…"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
          />
          <button
            onClick={addRequest}
            className="flex items-center rounded-md px-3 py-2"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {requests.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No requests yet.
            </p>
          )}
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex flex-col gap-1.5 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{req.text}</p>
                  {memberName(req.memberId) && (
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      requested by {memberName(req.memberId)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleVote(req)}
                  className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold"
                  style={{
                    borderColor: currentMemberId && req.votes.includes(currentMemberId) ? "var(--danger)" : "var(--border)",
                    color: currentMemberId && req.votes.includes(currentMemberId) ? "var(--danger)" : "var(--text-muted)",
                  }}
                >
                  <Heart size={13} fill={currentMemberId && req.votes.includes(currentMemberId) ? "currentColor" : "none"} />
                  {req.votes.length}
                </button>
                <button
                  onClick={() => setPromotingId(promotingId === req.id ? null : req.id)}
                  className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold"
                  style={{ borderColor: "var(--border)" }}
                >
                  <ArrowRight size={13} /> Menu
                </button>
              </div>
              {promotingId === req.id && (
                <div className="flex flex-wrap gap-1.5 border-t pt-1.5" style={{ borderColor: "var(--border)" }}>
                  {days.map((day) => (
                    <button
                      key={ymd(day)}
                      onClick={() => promote(req, ymd(day))}
                      className="rounded-full border px-2 py-1 text-[11px] font-medium"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {WEEKDAY_LABELS[day.getDay()]} {day.getDate()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
