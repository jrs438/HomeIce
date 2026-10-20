"use client";

import { useLocale } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "pt" : "en")}
      aria-label="Switch language"
      className="rounded-full px-2 py-1 text-xs font-bold"
      style={{ color: "var(--text-muted)" }}
      suppressHydrationWarning
    >
      {locale === "en" ? "PT" : "EN"}
    </button>
  );
}
