"use client";

import { Modal } from "@/components/modal";
import { Car, Users, Ban } from "lucide-react";
import type { MemberLite } from "@/components/events/types";
import type { ExternalDriverRecord, RideRecord } from "./types";

export function DriverPicker({
  members,
  externalDrivers,
  onSelect,
  onClose,
}: {
  members: MemberLite[];
  externalDrivers: ExternalDriverRecord[];
  onSelect: (driverType: RideRecord["driverType"], driverId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Assign driver" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Family
          </p>
          <div className="flex flex-col gap-1.5">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelect("member", m.id)}
                className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: m.color }}
                >
                  {m.name.slice(0, 1)}
                </span>
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            External
          </p>
          <div className="flex flex-col gap-1.5">
            {externalDrivers.map((d) => (
              <button
                key={d.id}
                onClick={() => onSelect("external", d.id)}
                className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--person-external)", background: "transparent" }}
              >
                <Car size={16} style={{ color: "var(--person-external)" }} />
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onSelect("carpool", null)}
            className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
          >
            <Users size={16} style={{ color: "var(--text-muted)" }} />
            Carpool
          </button>
          <button
            onClick={() => onSelect("unassigned", null)}
            className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
          >
            <Ban size={16} />
            Unassigned
          </button>
        </div>
      </div>
    </Modal>
  );
}
