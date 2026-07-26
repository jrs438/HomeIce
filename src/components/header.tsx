import Link from "next/link";
import { Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { InboxBadge } from "./inbox-badge";
import type { CurrentMember } from "./app-shell";

export function Header({ member }: { member: CurrentMember }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b bg-bg-panel px-4 py-3"
      style={{ borderColor: "var(--border)" }}
    >
      <Link href="/today" className="masthead text-xl tracking-tight" style={{ color: "var(--text)" }}>
        HOMEICE
      </Link>
      <div className="flex items-center gap-1">
        <InboxBadge />
        <ThemeToggle />
        <Link href="/settings" className="rounded-full p-2" style={{ color: "var(--text-muted)" }}>
          <Settings size={18} />
        </Link>
        {member && (
          <span
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold"
            style={{ borderColor: member.color, color: member.color }}
            title={member.name}
          >
            {member.name.slice(0, 1)}
          </span>
        )}
      </div>
    </header>
  );
}
