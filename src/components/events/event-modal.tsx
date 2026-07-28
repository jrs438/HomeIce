"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { ymd } from "@/lib/dates";
import { RIDE_KIND_LABELS } from "@/components/rides/types";
import type { RideRecord } from "@/components/rides/types";
import type { EventRecord, MemberLite } from "./types";

function toLocalInput(dt: string | null, allDay: boolean): string {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (allDay) return date;
  return `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function driverLabel(ride: RideRecord, members: MemberLite[]): string {
  if (ride.driverType === "unassigned") return "Unassigned";
  if (ride.driverType === "member") return members.find((m) => m.id === ride.driverId)?.name ?? "Member";
  if (ride.driverType === "carpool") return "Carpool";
  return "External driver";
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

  const [linkedRides, setLinkedRides] = useState<RideRecord[]>([]);
  const [addDropoff, setAddDropoff] = useState(false);
  const [dropoffTime, setDropoffTime] = useState("");
  const [dropoffFrom, setDropoffFrom] = useState("Home");
  const [dropoffTo, setDropoffTo] = useState(initial?.location ?? "");
  const [addPickup, setAddPickup] = useState(false);
  const [pickupTime, setPickupTime] = useState("");
  const [pickupFrom, setPickupFrom] = useState(initial?.location ?? "");
  const [pickupTo, setPickupTo] = useState("Home");

  const kids = members.filter((m) => m.role === "kid");
  const hasDropoff = linkedRides.some((r) => r.kind === "activity_dropoff");
  const hasPickup = linkedRides.some((r) => r.kind === "activity_pickup");

  useEffect(() => {
    if (!initial) return;
    let cancelled = false;
    const day = ymd(new Date(initial.start));
    fetch(`/api/rides?start=${day}&end=${day}`)
      .then((r) => r.json())
      .then((data: RideRecord[]) => {
        if (!cancelled) setLinkedRides(data.filter((r) => r.eventId === initial.id));
      });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  function toggleKid(id: string) {
    setKidIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  }

  function toggleDropoff() {
    const next = !addDropoff;
    setAddDropoff(next);
    if (next && !dropoffTime && !allDay && start) setDropoffTime(start.slice(11, 16));
  }

  function togglePickup() {
    const next = !addPickup;
    setAddPickup(next);
    if (next && !pickupTime && !allDay) setPickupTime((end || start).slice(11, 16));
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

      const eventDate = ymd(new Date(saved.start));
      const rideCreations: Promise<Response>[] = [];
      if (addDropoff && dropoffTime && dropoffFrom.trim() && dropoffTo.trim()) {
        rideCreations.push(
          fetch("/api/rides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId: saved.id,
              date: eventDate,
              time: dropoffTime,
              kind: "activity_dropoff",
              kidIds,
              from: dropoffFrom.trim(),
              to: dropoffTo.trim(),
            }),
          })
        );
      }
      if (addPickup && pickupTime && pickupFrom.trim() && pickupTo.trim()) {
        rideCreations.push(
          fetch("/api/rides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId: saved.id,
              date: eventDate,
              time: pickupTime,
              kind: "activity_pickup",
              kidIds,
              from: pickupFrom.trim(),
              to: pickupTo.trim(),
            }),
          })
        );
      }
      if (rideCreations.length) await Promise.all(rideCreations);

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
      if (initial.source === "recurring" && initial.sourceRef) {
        // The exceptions endpoint records the skip AND cancels this instance AND
        // cleans up any linked rides (both per-instance and rule-cascade ones) —
        // one call handles the whole "skip this occurrence" flow server-side.
        await fetch(`/api/event-rules/${initial.sourceRef}/exceptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: ymd(new Date(initial.start)) }),
        });
        onSaved({ ...initial, status: "cancelled" });
        onDeleted?.(initial.id);
        onClose();
        return;
      }

      const res = await fetch(`/api/events/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        const saved = await res.json();
        // DELETE notifies the driver (if a real one was assigned) before removing the ride.
        await Promise.all(linkedRides.map((r) => fetch(`/api/rides/${r.id}`, { method: "DELETE" })));
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
        {initial?.source === "recurring" && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Part of a recurring series — edits here only affect this occurrence.
          </p>
        )}

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
          onChange={(e) => {
            setLocation(e.target.value);
            if (!dropoffTo) setDropoffTo(e.target.value);
            if (!pickupFrom) setPickupFrom(e.target.value);
          }}
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

        {kidIds.length > 0 && !allDay && (
          <div className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Rides
            </p>

            {linkedRides.length > 0 && (
              <ul className="mb-2 flex flex-col gap-1">
                {linkedRides.map((r) => (
                  <li key={r.id} className="text-sm">
                    {RIDE_KIND_LABELS[r.kind]}: {r.from} → {r.to} at {r.time.slice(0, 5)} —{" "}
                    <span style={{ color: r.driverType === "unassigned" ? "var(--danger)" : "var(--text-muted)" }}>
                      {driverLabel(r, members)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {!hasDropoff && (
              <div className="mb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={addDropoff} onChange={toggleDropoff} />
                  Needs a drop-off ride
                </label>
                {addDropoff && (
                  <div className="mt-1.5 flex gap-1.5 pl-6">
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
                    <input
                      type="time"
                      value={dropoffTime}
                      onChange={(e) => setDropoffTime(e.target.value)}
                      className="rounded-md border px-2 py-1.5 text-xs"
                      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    />
                  </div>
                )}
              </div>
            )}

            {!hasPickup && (
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={addPickup} onChange={togglePickup} />
                  Needs a pick-up ride
                </label>
                {addPickup && (
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
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="rounded-md border px-2 py-1.5 text-xs"
                      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    />
                  </div>
                )}
              </div>
            )}

            {linkedRides.length > 0 && (
              <Link href="/rides" className="mt-2 inline-block text-xs underline" style={{ color: "var(--text-muted)" }}>
                Manage drivers on the Rides tab
              </Link>
            )}
          </div>
        )}

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
              {initial.source === "recurring" ? "Skip this occurrence" : "Cancel event"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
