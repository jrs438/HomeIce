"use client";

import { useEffect, useState } from "react";
import { Plus, Utensils } from "lucide-react";
import { EventRow } from "@/components/events/event-row";
import { EventModal } from "@/components/events/event-modal";
import type { EventRecord, MemberLite } from "@/components/events/types";
import { RideRow } from "@/components/rides/ride-row";
import { DriverPicker } from "@/components/rides/driver-picker";
import type { ExternalDriverRecord, RideRecord } from "@/components/rides/types";

type TimelineItem =
  | { kind: "event"; time: number; event: EventRecord }
  | { kind: "ride"; time: number; ride: RideRecord };

function rideTimestamp(date: string, time: string): number {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function TodayClient({
  heading,
  initialEvents,
  initialRides,
  members,
  externalDrivers,
  dinner,
}: {
  heading: string;
  initialEvents: EventRecord[];
  initialRides: RideRecord[];
  members: MemberLite[];
  externalDrivers: ExternalDriverRecord[];
  dinner: { meal: string; isYomTov: boolean } | null;
}) {
  const [eventList, setEventList] = useState(initialEvents);
  const [ridesList, setRidesList] = useState(initialRides);
  const [modalEvent, setModalEvent] = useState<EventRecord | "new" | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const timeline: TimelineItem[] = [
    ...eventList.map((event): TimelineItem => ({ kind: "event", time: new Date(event.start).getTime(), event })),
    ...ridesList.map((ride): TimelineItem => ({ kind: "ride", time: rideTimestamp(ride.date, ride.time), ride })),
  ].sort((a, b) => a.time - b.time);

  const nextIndex = timeline.findIndex((item) => {
    if (item.kind === "event") {
      const end = item.event.end ? new Date(item.event.end).getTime() : new Date(item.event.start).getTime();
      return item.event.status !== "cancelled" && end >= now;
    }
    return item.time >= now;
  });

  function upsertEvent(updated: EventRecord) {
    setEventList((prev) => {
      const exists = prev.some((e) => e.id === updated.id);
      return exists ? prev.map((e) => (e.id === updated.id ? updated : e)) : [...prev, updated];
    });
  }

  function upsertRide(updated: RideRecord) {
    setRidesList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function assign(rideId: string, driverType: RideRecord["driverType"], driverId: string | null) {
    const res = await fetch(`/api/rides/${rideId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverType, driverId, confirmed: driverType !== "unassigned" }),
    });
    if (res.ok) upsertRide(await res.json());
    setAssigningId(null);
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
        {timeline.length === 0 && (
          <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Nothing on the run-of-show yet today.
          </p>
        )}
        {timeline.map((item, i) =>
          item.kind === "event" ? (
            <EventRow
              key={`e-${item.event.id}`}
              event={item.event}
              members={members}
              next={i === nextIndex}
              onClick={() => setModalEvent(item.event)}
            />
          ) : (
            <RideRow
              key={`r-${item.ride.id}`}
              ride={item.ride}
              members={members}
              externalDrivers={externalDrivers}
              onAssign={() => setAssigningId(item.ride.id)}
            />
          )
        )}
      </div>

      {modalEvent && (
        <EventModal
          initial={modalEvent === "new" ? undefined : modalEvent}
          members={members}
          onClose={() => setModalEvent(null)}
          onSaved={upsertEvent}
        />
      )}

      {assigningId && (
        <DriverPicker
          members={members}
          externalDrivers={externalDrivers}
          onClose={() => setAssigningId(null)}
          onSelect={(driverType, driverId) => assign(assigningId, driverType, driverId)}
        />
      )}
    </div>
  );
}
