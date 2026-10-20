"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { addDays, ymd } from "@/lib/dates";
import { useLocale, type TranslationKey } from "@/lib/i18n";
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

  const days = useMemo(() => {
    const start = new Date(`${todayDate}T00:00:00`);
    const count = view === "day" ? 1 : 7;
    return Array.from({ length: count }, (_, i) => addDays(start, i));
  }, [todayDate, view]);

  function driverLabel(ride: RideRecord): string {
    if (ride.driverType === "unassigned") return t("unassigned");
    if (ride.driverType === "member") return members.find((m) => m.id === ride.driverId)?.name ?? t("unassigned");
    if (ride.driverType === "external") return externalDrivers.find((d) => d.id === ride.driverId)?.label ?? t("unassigned");
    if (ride.driverType === "carpool") return t("carpool");
    return t("unassigned");
  }

  function kidNames(kidIds: string[]): string {
    return members
      .filter((m) => kidIds.includes(m.id))
      .map((m) => m.name)
      .join(", ");
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="masthead text-xl">{t("printTitle")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === "en" ? "pt" : "en")}
            className="rounded-md border px-2.5 py-1.5 text-xs font-bold"
            style={{ borderColor: "var(--border)" }}
          >
            {locale === "en" ? "PT" : "EN"}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            <Printer size={14} /> {t("print")}
          </button>
        </div>
      </div>

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

      <h1 className="mb-4 hidden text-2xl font-bold print:block">{t("printTitle")}</h1>

      <div className="flex flex-col gap-5">
        {days.map((day) => {
          const dayEvents = initialEvents.filter((e) => isSameLocalDay(e.start, day));
          const dayRides = initialRides.filter((r) => r.date === ymd(day));
          const timeline: TimelineItem[] = [
            ...dayEvents.map((event): TimelineItem => ({ kind: "event", time: new Date(event.start).getTime(), event })),
            ...dayRides.map((ride): TimelineItem => ({ kind: "ride", time: rideTimestamp(ride.date, ride.time), ride })),
          ].sort((a, b) => a.time - b.time);

          return (
            <div
              key={ymd(day)}
              className="rounded-lg border p-3 print:break-inside-avoid print:rounded-none print:border-black print:p-2"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="mb-2 text-sm font-bold uppercase tracking-wide print:text-black">
                {weekdayLabels[day.getDay()]}, {monthLabels[day.getMonth()]} {day.getDate()}
              </p>
              {timeline.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("noItemsThisDay")}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {timeline.map((item) =>
                    item.kind === "event" ? (
                      <div key={`e-${item.event.id}`} className="text-sm print:text-black">
                        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                          {item.event.allDay
                            ? t("allDay")
                            : new Date(item.event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>{" "}
                        <strong>{item.event.title}</strong>
                        {item.event.location && <span> — {item.event.location}</span>}
                        {item.event.kidIds.length > 0 && (
                          <span style={{ color: "var(--text-muted)" }}> ({kidNames(item.event.kidIds)})</span>
                        )}
                      </div>
                    ) : (
                      <div key={`r-${item.ride.id}`} className="text-sm print:text-black">
                        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Date(`${item.ride.date}T${item.ride.time}`).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>{" "}
                        <strong>{t(RIDE_KIND_KEYS[item.ride.kind])}</strong>: {item.ride.from} → {item.ride.to}
                        {item.ride.kidIds.length > 0 && (
                          <span style={{ color: "var(--text-muted)" }}> ({kidNames(item.ride.kidIds)})</span>
                        )}
                        <span style={{ color: "var(--text-muted)" }}>
                          {" "}
                          — {t("driverLabel")}: {driverLabel(item.ride)}
                        </span>
                      </div>
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
