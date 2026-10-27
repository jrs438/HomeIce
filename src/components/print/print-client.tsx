"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createElement } from "react";
import { ChevronLeft, Printer, MapPin } from "lucide-react";
import { addDays, ymd } from "@/lib/dates";
import { useLocale, type TranslationKey } from "@/lib/i18n";
import { iconForEvent } from "@/lib/event-icon";
import type { EventRecord, MemberLite } from "@/components/events/types";
import type { ExternalDriverRecord, RideRecord } from "@/components/rides/types";

type ViewMode = "day" | "week";

type TimelineItem =
  | { kind: "event"; time: number; event: EventRecord }
  | { kind: "ride"; time: number; ride: RideRecord };

const RIDE_KIND_KEYS: Record<RideRecord["kind"], TranslationKey> = {
  activity_dropoff: "dropOff",
  activity_pickup: "pickup",
  school_pickup: "schoolPickup",
};

function rideTimestamp(date: string, time: string): number {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function isSameLocalDay(iso: string, day: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
}

export function PrintClient({
  todayDate,
  initialEvents,
  initialRides,
  members,
  externalDrivers,
}: {
  todayDate: string;
  initialEvents: EventRecord[];
  initialRides: RideRecord[];
  members: MemberLite[];
  externalDrivers: ExternalDriverRecord[];
}) {
  const { t, locale, setLocale, weekdayLabels, monthLabels } = useLocale();
  const [view, setView] = useState<ViewMode>("week");

  // window.print() -- and even window.open()/an <a target="_blank"> click --
  // are silent no-ops in this app's installed/home-screen standalone
  // context on iOS: it's fully walled off, with no way to open a new
  // browsing context at all. The Web Share API's native share sheet isn't a
  // windowing API, so it works even there, and iOS's share sheet has its
  // own "Print" action for a shared URL.
  async function handlePrint() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t("printTitle"), url: window.location.href });
        return;
      } catch {
        // User dismissed the share sheet, or sharing isn't usable here --
        // fall through to a direct print attempt.
      }
    }
    window.print();
  }

  const days = useMemo(() => {
    const start = new Date(`${todayDate}T00:00:00`);
    const count = view === "day" ? 1 : 7;
    return Array.from({ length: count }, (_, i) => addDays(start, i));
  }, [todayDate, view]);

  function driverInfo(ride: RideRecord): { label: string; assigned: boolean } {
    if (ride.driverType === "member") {
      const m = members.find((mm) => mm.id === ride.driverId);
      if (m) return { label: m.name, assigned: true };
    }
    if (ride.driverType === "external") {
      const d = externalDrivers.find((dd) => dd.id === ride.driverId);
      if (d) return { label: d.label, assigned: true };
    }
    if (ride.driverType === "carpool") return { label: t("carpool"), assigned: true };
    return { label: t("unassigned"), assigned: false };
  }

  function kidsFor(kidIds: string[]) {
    return members.filter((m) => kidIds.includes(m.id));
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/today" className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={18} /> {t("back")}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === "en" ? "pt" : "en")}
            className="rounded-md border px-2.5 py-1.5 text-xs font-bold"
            style={{ borderColor: "var(--border)" }}
          >
            {locale === "en" ? "PT" : "EN"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            <Printer size={14} /> {t("print")}
          </button>
        </div>
      </div>

      <h1 className="masthead mb-3 text-xl print:text-2xl print:text-black">{t("printTitle")}</h1>

      <div className="mb-4 flex gap-2 print:hidden">
        <button
          onClick={() => setView("day")}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          style={{
            borderColor: "var(--border)",
            background: view === "day" ? "var(--accent)" : "transparent",
            color: view === "day" ? "var(--accent-text)" : "var(--text)",
          }}
        >
          {t("today")}
        </button>
        <button
          onClick={() => setView("week")}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          style={{
            borderColor: "var(--border)",
            background: view === "week" ? "var(--accent)" : "transparent",
            color: view === "week" ? "var(--accent-text)" : "var(--text)",
          }}
        >
          {t("thisWeek")}
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {days.map((day) => {
          const dayEvents = initialEvents.filter((e) => isSameLocalDay(e.start, day));
          const dayRides = initialRides.filter((r) => r.date === ymd(day));
          const timeline: TimelineItem[] = [
            ...dayEvents.map((event): TimelineItem => ({ kind: "event", time: new Date(event.start).getTime(), event })),
            ...dayRides.map((ride): TimelineItem => ({ kind: "ride", time: rideTimestamp(ride.date, ride.time), ride })),
          ].sort((a, b) => a.time - b.time);

          return (
            <div key={ymd(day)} className="print:break-inside-avoid">
              <p
                className="mb-2 border-b-2 pb-1 text-sm font-bold uppercase tracking-wide print:border-black print:text-black"
                style={{ borderColor: "var(--accent)" }}
              >
                {weekdayLabels[day.getDay()]}, {monthLabels[day.getMonth()]} {day.getDate()}
              </p>
              {timeline.length === 0 ? (
                <p className="py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("noItemsThisDay")}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {timeline.map((item) =>
                    item.kind === "event" ? (
                      <div
                        key={`e-${item.event.id}`}
                        className="flex items-start gap-3 rounded-lg border px-3 py-2 print:rounded-none print:border-black"
                        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
                      >
                        <div className="w-16 shrink-0 pt-0.5 font-mono text-xs font-semibold print:text-black" style={{ color: "var(--text-muted)" }}>
                          {item.event.allDay
                            ? t("allDay")
                            : new Date(item.event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </div>
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg print:hidden"
                          style={{ background: "var(--tile-bg)", color: "var(--tile-fg)" }}
                        >
                          {createElement(iconForEvent(item.event.title), { size: 16 })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold print:text-black">{item.event.title}</p>
                          {item.event.location && (
                            <p className="flex items-center gap-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                              <MapPin size={11} className="print:hidden" /> {item.event.location}
                            </p>
                          )}
                          {item.event.kidIds.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {kidsFor(item.event.kidIds).map((k) => (
                                <span
                                  key={k.id}
                                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white print:!border print:!border-black print:!bg-white print:!text-black"
                                  style={{ background: k.color }}
                                >
                                  {k.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const driver = driverInfo(item.ride);
                        return (
                          <div
                            key={`r-${item.ride.id}`}
                            className="flex items-start gap-3 rounded-lg border px-3 py-2 print:rounded-none print:border-black"
                            style={{
                              borderColor: driver.assigned ? "var(--border)" : "var(--danger)",
                              background: "var(--bg-panel)",
                            }}
                          >
                            <div className="w-16 shrink-0 pt-0.5 font-mono text-xs font-semibold print:text-black" style={{ color: "var(--text-muted)" }}>
                              {new Date(`${item.ride.date}T${item.ride.time}`).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold print:text-black">
                                {t(RIDE_KIND_KEYS[item.ride.kind])} · {item.ride.from} → {item.ride.to}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {kidsFor(item.ride.kidIds).map((k) => (
                                  <span
                                    key={k.id}
                                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white print:!border print:!border-black print:!bg-white print:!text-black"
                                    style={{ background: k.color }}
                                  >
                                    {k.name}
                                  </span>
                                ))}
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] font-bold print:!border print:!border-black print:!bg-white print:!text-black"
                                  style={{
                                    background: driver.assigned ? "transparent" : "var(--danger)",
                                    color: driver.assigned ? "var(--text-muted)" : "white",
                                    border: driver.assigned ? "1px solid var(--border)" : "none",
                                  }}
                                >
                                  {t("driverLabel")}: {driver.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
