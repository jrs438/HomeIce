import { createElement } from "react";
import { MapPin } from "lucide-react";
import { iconForEvent } from "@/lib/event-icon";
import type { EventRecord, MemberLite } from "./types";

export function EventRow({
  event,
  members,
  next,
  onClick,
}: {
  event: EventRecord;
  members: MemberLite[];
  next?: boolean;
  onClick?: () => void;
}) {
  const eventIcon = createElement(iconForEvent(event.title), { size: 18 });
  const kids = members.filter((m) => event.kidIds.includes(m.id));
  const time = event.allDay
    ? "All day"
    : new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left"
      style={{
        borderColor: next ? "var(--accent)" : "var(--border)",
        background: "var(--bg-panel)",
        opacity: event.status === "cancelled" ? 0.5 : 1,
      }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "var(--tile-bg)", color: "var(--tile-fg)" }}
      >
        {eventIcon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {next && (
            <span
              className="rink-label rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              Next
            </span>
          )}
          <p
            className="truncate text-sm font-semibold"
            style={{ textDecoration: event.status === "cancelled" ? "line-through" : "none" }}
          >
            {event.title}
          </p>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="font-mono">{time}</span>
          {event.location && (
            <span className="flex items-center gap-0.5">
              <MapPin size={11} /> {event.location}
            </span>
          )}
        </div>
      </div>
      {kids.length > 0 && (
        <div className="flex shrink-0 -space-x-1.5">
          {kids.map((k) => (
            <span
              key={k.id}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold text-white"
              style={{ background: k.color, borderColor: "var(--bg-panel)" }}
              title={k.name}
            >
              {k.name.slice(0, 1)}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
