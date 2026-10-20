import { Trash2 } from "lucide-react";
import { DriverPuck } from "@/components/puck";
import type { MemberLite } from "@/components/events/types";
import { useLocale, type TranslationKey } from "@/lib/i18n";
import type { ExternalDriverRecord, RideRecord } from "./types";

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const RIDE_KIND_KEYS: Record<RideRecord["kind"], TranslationKey> = {
  activity_dropoff: "dropOff",
  activity_pickup: "pickup",
  school_pickup: "schoolPickup",
};

export function RideRow({
  ride,
  members,
  externalDrivers,
  onAssign,
  onDelete,
}: {
  ride: RideRecord;
  members: MemberLite[];
  externalDrivers: ExternalDriverRecord[];
  onAssign: () => void;
  onDelete: () => void;
}) {
  const { t } = useLocale();
  const kids = members.filter((m) => ride.kidIds.includes(m.id));
  const driverMember = ride.driverType === "member" ? members.find((m) => m.id === ride.driverId) : null;
  const driverExternal = ride.driverType === "external" ? externalDrivers.find((d) => d.id === ride.driverId) : null;

  return (
    <div
      className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
      style={{
        borderColor: ride.driverType === "unassigned" ? "var(--danger)" : "var(--border)",
        background: "var(--bg-panel)",
      }}
    >
      <div className="w-16 shrink-0 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
        {formatTime(ride.time)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {t(RIDE_KIND_KEYS[ride.kind])} · {ride.from} → {ride.to}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {kids.map((k) => (
            <span
              key={k.id}
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ background: k.color }}
            >
              {k.name}
            </span>
          ))}
        </div>
      </div>
      <button onClick={onAssign} className="shrink-0">
        {ride.driverType === "member" && driverMember && (
          <DriverPuck name={driverMember.name} color={driverMember.color} />
        )}
        {ride.driverType === "external" && driverExternal && <DriverPuck name={driverExternal.label} external />}
        {ride.driverType === "carpool" && <DriverPuck name={t("carpool")} external />}
        {ride.driverType === "unassigned" && (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
            style={{ background: "var(--danger)" }}
          >
            {t("unassigned")}
          </span>
        )}
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete ride"
        className="shrink-0 rounded p-1"
        style={{ color: "var(--text-muted)" }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
