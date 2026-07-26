"use client";

import { useEffect, useState } from "react";
import { Plus, Utensils } from "lucide-react";
import { EventRow } from "@/components/events/event-row";
import { EventModal } from "@/components/events/event-modal";
import type { EventRecord, MemberLite } from "@/components/events/types";

export function TodayClient({
  heading,
  initialEvents,
  members,
  dinner,
}: {
  heading: string;
  initialEvents: EventRecord[];
  members: MemberLite[];
  dinner: { meal: string; isYomTov: boolean } | null;
}) {
  const [eventList, setEventList] = useState(initialEvents);
  const [modalEvent, setModalEvent] = useState<EventRecord | "new" | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const nextIndex = eventList.findIndex((e) => {
    const end = e.end ? new Date(e.end).getTime() : new Date(e.start).getTime();
    return e.status !== "cancelled" && end >= now;
  });

  function upsert(updated: EventRecord) {
    setEventList((prev) => {
      const exists = prev.some((e) => e.id === updated.id);
      const next = exists ? prev.map((e) => (e.id === updated.id ? updated : e)) : [...prev, updated];
      return next.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="day-heading text-3xl">{heading}</h1>
        <button
          onClick={() => setModalEvent("new")}
          className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {dinner && (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
        >
          <Utensils size={16} style={{ color: "var(--accent)" }} />
          <span>
            Tonight: <strong>{dinner.meal}</strong>
            {dinner.isYomTov && <span style={{ color: "var(--text-muted)" }}> · Yom Tov</span>}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {eventList.length === 0 && (
          <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Nothing on the run-of-show yet today.
          </p>
        )}
        {eventList.map((event, i) => (
          <EventRow
            key={event.id}
            event={event}
            members={members}
            next={i === nextIndex}
            onClick={() => setModalEvent(event)}
          />
        ))}
      </div>

      {modalEvent && (
        <EventModal
          initial={modalEvent === "new" ? undefined : modalEvent}
          members={members}
          onClose={() => setModalEvent(null)}
          onSaved={upsert}
        />
      )}
    </div>
  );
}
