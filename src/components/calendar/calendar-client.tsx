"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { EventRow } from "@/components/events/event-row";
import { EventModal } from "@/components/events/event-modal";
import { EventRulesEditor } from "./event-rules-editor";
import type { EventRecord, MemberLite } from "@/components/events/types";
import type { EventRuleRecord } from "@/components/rides/types";
import { addDays, startOfDay, startOfWeek, isSameDay, ymd, WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/dates";

type ViewMode = "month" | "week" | "day";

const KID_FILTER_KEY = "hi-calendar-kid-filter";

// A minimal external store around localStorage so the per-kid filter reads
// via useSyncExternalStore — the server (and the client's first render,
// pre-hydration) always sees null, and React reconciles to the real stored
// value right after mount without a hydration mismatch.
const kidFilterListeners = new Set<() => void>();
function subscribeKidFilter(cb: () => void) {
  kidFilterListeners.add(cb);
  return () => kidFilterListeners.delete(cb);
}
function getKidFilterSnapshot(): string | null {
  try {
    return localStorage.getItem(KID_FILTER_KEY);
  } catch {
    return null;
  }
}
function getKidFilterServerSnapshot(): string | null {
  return null;
}
function setStoredKidFilter(value: string[] | null) {
  try {
    if (value) localStorage.setItem(KID_FILTER_KEY, JSON.stringify(value));
    else localStorage.removeItem(KID_FILTER_KEY);
  } catch {
    // private browsing / storage disabled — filter just won't persist
  }
  kidFilterListeners.forEach((cb) => cb());
}

export function CalendarClient({ members }: { members: MemberLite[] }) {
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [eventsList, setEventsList] = useState<EventRecord[]>([]);
  const [modalEvent, setModalEvent] = useState<EventRecord | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventRules, setEventRules] = useState<EventRuleRecord[]>([]);
  const [showRulesEditor, setShowRulesEditor] = useState(false);

  const kids = members.filter((m) => m.role === "kid");
  // null = no filter applied (show everyone); persisted per-browser so each
  // kid's own device remembers "just show me" without affecting anyone else.
  const kidFilterRaw = useSyncExternalStore(subscribeKidFilter, getKidFilterSnapshot, getKidFilterServerSnapshot);
  const kidFilter = useMemo<string[] | null>(() => {
    if (!kidFilterRaw) return null;
    try {
      return JSON.parse(kidFilterRaw);
    } catch {
      return null;
    }
  }, [kidFilterRaw]);

  function toggleKidFilter(kidId: string) {
    const active = kidFilter ?? kids.map((k) => k.id);
    const next = active.includes(kidId) ? active.filter((id) => id !== kidId) : [...active, kidId];
    setStoredKidFilter(next.length === kids.length ? null : next);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/event-rules")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEventRules(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { rangeStart, gridStart, gridEnd } = useMemo(() => {
    if (view === "day") {
      return { rangeStart: anchor, gridStart: anchor, gridEnd: addDays(anchor, 1) };
    }
    if (view === "week") {
      const s = startOfWeek(anchor);
      return { rangeStart: s, gridStart: s, gridEnd: addDays(s, 7) };
    }
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const gStart = startOfWeek(firstOfMonth);
    const gEnd = addDays(startOfWeek(lastOfMonth), 7);
    return { rangeStart: firstOfMonth, gridStart: gStart, gridEnd: gEnd };
  }, [view, anchor]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events?start=${gridStart.toISOString()}&end=${gridEnd.toISOString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEventsList(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gridStart, gridEnd]);

  function upsert(updated: EventRecord) {
    setEventsList((prev) => {
      const exists = prev.some((e) => e.id === updated.id);
      return exists ? prev.map((e) => (e.id === updated.id ? updated : e)) : [...prev, updated];
    });
  }

  function eventsOn(day: Date) {
    return eventsList
      .filter((e) => {
        const s = new Date(e.start);
        const en = e.end ? new Date(e.end) : s;
        return s <= addDays(day, 1) && en >= day;
      })
      // Family-wide events (no kid tagged) always show through the filter —
      // only events tied to specific kids get narrowed down.
      .filter((e) => !kidFilter || e.kidIds.length === 0 || e.kidIds.some((id) => kidFilter.includes(id)))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  function step(dir: 1 | -1) {
    if (view === "day") setAnchor((a) => addDays(a, dir));
    else if (view === "week") setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
  }

  const title =
    view === "month"
      ? `${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`
      : view === "week"
        ? `${MONTH_LABELS[rangeStart.getMonth()]} ${rangeStart.getDate()} – ${MONTH_LABELS[addDays(rangeStart, 6).getMonth()]} ${addDays(rangeStart, 6).getDate()}`
        : `${WEEKDAY_LABELS[anchor.getDay()]}, ${MONTH_LABELS[anchor.getMonth()]} ${anchor.getDate()}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="masthead text-xl">CALENDAR</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRulesEditor(true)}
            className="rounded-full border p-1.5"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            aria-label="Recurring events"
          >
            <Repeat size={16} />
          </button>
          <div className="flex gap-1 rounded-full border p-0.5" style={{ borderColor: "var(--border)" }}>
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
                style={{
                  background: view === v ? "var(--accent)" : "transparent",
                  color: view === v ? "var(--accent-text)" : "var(--text-muted)",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {kids.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {kids.map((k) => {
            const active = !kidFilter || kidFilter.includes(k.id);
            return (
              <button
                key={k.id}
                onClick={() => toggleKidFilter(k.id)}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{
                  borderColor: active ? k.color : "var(--border)",
                  background: active ? k.color : "transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                  opacity: active ? 1 : 0.6,
                }}
              >
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: active ? "rgba(255,255,255,0.3)" : k.color, color: active ? "#fff" : "#fff" }}
                >
                  {k.name.slice(0, 1)}
                </span>
                {k.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => step(-1)} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <button
            onClick={() => setAnchor(startOfDay(new Date()))}
            className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            Today
          </button>
        </div>
        <button onClick={() => step(1)} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {loading && (
        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Loading…
        </p>
      )}

      {view === "month" && (
        <MonthGrid
          gridStart={gridStart}
          gridEnd={gridEnd}
          anchorMonth={anchor.getMonth()}
          eventsOn={eventsOn}
          onDayClick={(d) => {
            setAnchor(d);
            setView("day");
          }}
          onEventClick={(e) => setModalEvent(e)}
        />
      )}

      {(view === "week" || view === "day") && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: view === "week" ? 7 : 1 }, (_, i) => addDays(rangeStart, i)).map((day) => (
            <div key={ymd(day)} className="flex flex-col gap-2">
              <p className="rink-label text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                {WEEKDAY_LABELS[day.getDay()]} {MONTH_LABELS[day.getMonth()]} {day.getDate()}
              </p>
              {eventsOn(day).length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Nothing scheduled
                </p>
              ) : (
                eventsOn(day).map((event) => (
                  <EventRow key={event.id} event={event} members={members} onClick={() => setModalEvent(event)} />
                ))
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setModalEvent("new")}
        className="fixed bottom-24 right-4 z-30 rounded-full px-4 py-3 text-sm font-semibold shadow-lg"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}
      >
        + Add
      </button>

      {modalEvent && (
        <EventModal
          initial={modalEvent === "new" ? undefined : modalEvent}
          members={members}
          defaultDate={anchor}
          onClose={() => setModalEvent(null)}
          onSaved={upsert}
        />
      )}

      {showRulesEditor && (
        <EventRulesEditor
          rules={eventRules}
          members={members}
          onClose={() => {
            setShowRulesEditor(false);
            fetch(`/api/events?start=${gridStart.toISOString()}&end=${gridEnd.toISOString()}`)
              .then((r) => r.json())
              .then(setEventsList);
          }}
          onChange={setEventRules}
        />
      )}
    </div>
  );
}

function MonthGrid({
  gridStart,
  gridEnd,
  anchorMonth,
  eventsOn,
  onDayClick,
  onEventClick,
}: {
  gridStart: Date;
  gridEnd: Date;
  anchorMonth: number;
  eventsOn: (d: Date) => EventRecord[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: EventRecord) => void;
}) {
  const days: Date[] = [];
  for (let d = gridStart; d < gridEnd; d = addDays(d, 1)) days.push(d);
  const today = startOfDay(new Date());

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayEvents = eventsOn(day);
          const inMonth = day.getMonth() === anchorMonth;
          return (
            <button
              key={ymd(day)}
              onClick={() => onDayClick(day)}
              className="flex min-h-16 flex-col items-start gap-0.5 rounded-md border p-1 text-left"
              style={{
                borderColor: isSameDay(day, today) ? "var(--accent)" : "var(--border)",
                background: "var(--bg-panel)",
                opacity: inMonth ? 1 : 0.4,
              }}
            >
              <span className="text-[11px] font-semibold">{day.getDate()}</span>
              <div className="flex flex-wrap gap-0.5">
                {dayEvents.slice(0, 4).map((e) => (
                  <span
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEventClick(e);
                    }}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                    title={e.title}
                  />
                ))}
                {dayEvents.length > 4 && (
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                    +{dayEvents.length - 4}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
