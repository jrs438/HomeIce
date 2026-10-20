"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Settings2, Sparkles } from "lucide-react";
import type { MemberLite } from "@/components/events/types";
import { RideRow } from "./ride-row";
import { DriverPicker } from "./driver-picker";
import { RideModal } from "./ride-modal";
import { RulesEditor } from "./rules-editor";
import type { ExternalDriverRecord, RideRecord, RideRuleRecord } from "./types";
import { addDays, startOfDay, startOfWeek, ymd } from "@/lib/dates";
import { useLocale } from "@/lib/i18n";

export function RidesClient({
  members,
  externalDrivers,
  initialRules,
}: {
  members: MemberLite[];
  externalDrivers: ExternalDriverRecord[];
  initialRules: RideRuleRecord[];
}) {
  const { t, weekdayLabels, monthLabels } = useLocale();
  const [anchor, setAnchor] = useState(() => startOfWeek(startOfDay(new Date())));
  const [ridesList, setRidesList] = useState<RideRecord[]>([]);
  const [rules, setRules] = useState(initialRules);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [addingRide, setAddingRide] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);
  const [emailWarnings, setEmailWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rides?start=${ymd(anchor)}&end=${ymd(addDays(anchor, 6))}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRidesList(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [anchor]);

  function upsertRide(ride: RideRecord) {
    setRidesList((prev) => {
      const exists = prev.some((r) => r.id === ride.id);
      return exists ? prev.map((r) => (r.id === ride.id ? ride : r)) : [...prev, ride];
    });
  }

  async function removeRide(rideId: string) {
    if (!confirm(t("deleteRideConfirm"))) return;
    const res = await fetch(`/api/rides/${rideId}`, { method: "DELETE" });
    if (res.ok) {
      setRidesList((prev) => prev.filter((r) => r.id !== rideId));
    }
  }

  async function assign(rideId: string, driverType: RideRecord["driverType"], driverId: string | null) {
    const res = await fetch(`/api/rides/${rideId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverType, driverId, confirmed: driverType !== "unassigned" }),
    });
    if (res.ok) {
      const data = await res.json();
      upsertRide(data);
      setEmailWarnings(data.emailWarnings ?? []);
    }
    setAssigningId(null);
  }

  async function generate() {
    setGenerating(true);
    setGenerateMsg(null);
    try {
      const res = await fetch("/api/rides/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: anchor.toISOString() }),
      });
      const data = await res.json();
      const msgTemplate = t(data.created === 1 ? "createdRidesSingular" : "createdRidesPlural");
      setGenerateMsg(msgTemplate.replace("{n}", String(data.created)));
      const refreshed = await fetch(`/api/rides?start=${ymd(anchor)}&end=${ymd(addDays(anchor, 6))}`).then((r) => r.json());
      setRidesList(refreshed);
    } finally {
      setGenerating(false);
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const unassignedCount = ridesList.filter((r) => r.driverType === "unassigned").length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="masthead text-xl">{t("ridesHeading")}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--border)" }}
          >
            <Settings2 size={14} /> {t("defaults")}
          </button>
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
            style={{ borderColor: "var(--border)" }}
          >
            <Sparkles size={14} /> {generating ? t("generating") : t("generateWeek")}
          </button>
        </div>
      </div>

      {generateMsg && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {generateMsg}
        </p>
      )}

      {emailWarnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border p-2 text-xs" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
          {emailWarnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
          <button onClick={() => setEmailWarnings([])} className="self-start underline">
            {t("dismiss")}
          </button>
        </div>
      )}

      {unassignedCount > 0 && (
        <div
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: "var(--danger)" }}
        >
          {unassignedCount} {t(unassignedCount === 1 ? "rideNeedDriverSingular" : "rideNeedDriverPlural")}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => setAnchor((a) => addDays(a, -7))} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={20} />
        </button>
        <p className="text-sm font-semibold">
          {monthLabels[anchor.getMonth()]} {anchor.getDate()} – {monthLabels[addDays(anchor, 6).getMonth()]}{" "}
          {addDays(anchor, 6).getDate()}
        </p>
        <button onClick={() => setAnchor((a) => addDays(a, 7))} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {loading && (
        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          {t("loading")}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {days.map((day) => {
          const dayRides = ridesList
            .filter((r) => r.date === ymd(day))
            .sort((a, b) => a.time.localeCompare(b.time));
          return (
            <div key={ymd(day)} className="flex flex-col gap-2">
              <p className="rink-label text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                {weekdayLabels[day.getDay()]} {monthLabels[day.getMonth()]} {day.getDate()}
              </p>
              {dayRides.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("noRideLegs")}
                </p>
              ) : (
                dayRides.map((ride) => (
                  <RideRow
                    key={ride.id}
                    ride={ride}
                    members={members}
                    externalDrivers={externalDrivers}
                    onAssign={() => setAssigningId(ride.id)}
                    onDelete={() => removeRide(ride.id)}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setAddingRide(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-1 rounded-full px-4 py-3 text-sm font-semibold shadow-lg"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}
      >
        <Plus size={16} /> {t("addRide")}
      </button>

      {assigningId && (
        <DriverPicker
          members={members}
          externalDrivers={externalDrivers}
          onClose={() => setAssigningId(null)}
          onSelect={(driverType, driverId) => assign(assigningId, driverType, driverId)}
        />
      )}

      {addingRide && (
        <RideModal members={members} defaultDate={anchor} onClose={() => setAddingRide(false)} onSaved={upsertRide} />
      )}

      {showRules && (
        <RulesEditor
          rules={rules}
          members={members}
          externalDrivers={externalDrivers}
          onClose={() => setShowRules(false)}
          onChange={setRules}
        />
      )}
    </div>
  );
}
