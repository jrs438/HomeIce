"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventRow } from "@/components/events/event-row";
import { EventModal } from "@/components/events/event-modal";
import type { EventRecord, MemberLite } from "@/components/events/types";
import { addDays, startOfDay, startOfWeek, isSameDay, ymd, WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/dates";

type ViewMode = "month" | "week" | "day";

export function CalendarClient({ members }: { members: MemberLite[] }) {
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [eventsList, setEventsList] = useState<EventRecord[]>([]);
  const [modalEvent, setModalEvent] = useState<EventRecord | "new" | null>(null);
  const [loading, setLoading] = useState(true);

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
