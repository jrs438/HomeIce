"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";

export function InboxBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/inbox/count")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCount(d.count ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link href="/inbox" className="relative rounded-full p-2" style={{ color: "var(--text-muted)" }}>
      <Inbox size={18} />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
          style={{ background: "var(--danger)" }}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
