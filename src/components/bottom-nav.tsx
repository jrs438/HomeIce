"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, Car, CalendarDays, ShoppingCart, ListChecks, Utensils } from "lucide-react";
import { useLocale, type TranslationKey } from "@/lib/i18n";

const NAV_ITEMS: { href: string; labelKey: TranslationKey; icon: typeof Newspaper }[] = [
  { href: "/today", labelKey: "navToday", icon: Newspaper },
  { href: "/rides", labelKey: "navRides", icon: Car },
  { href: "/calendar", labelKey: "navCalendar", icon: CalendarDays },
  { href: "/shop", labelKey: "navShop", icon: ShoppingCart },
  { href: "/jobs", labelKey: "navJobs", icon: ListChecks },
  { href: "/eat", labelKey: "navEat", icon: Utensils },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-bg-panel"
      style={{ borderColor: "var(--border)" }}
    >
      <ul className="flex justify-between px-1">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium"
                style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="rink-label">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
