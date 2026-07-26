"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, Car, CalendarDays, ShoppingCart, ListChecks, Utensils } from "lucide-react";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: Newspaper },
  { href: "/rides", label: "Rides", icon: Car },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/shop", label: "Shop", icon: ShoppingCart },
  { href: "/jobs", label: "Jobs", icon: ListChecks },
  { href: "/eat", label: "Eat", icon: Utensils },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-bg-panel"
      style={{ borderColor: "var(--border)" }}
    >
      <ul className="flex justify-between px-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium"
                style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="rink-label">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
