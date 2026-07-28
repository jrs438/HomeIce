"use client";

import { useEffect } from "react";

/**
 * iOS Safari's manual "Add to Home Screen" bookmarks whatever page is on
 * screen at the time (it ignores the manifest's start_url, unlike Android's
 * manifest-driven install) — so an icon added from here would otherwise
 * relaunch these instructions forever instead of the app.
 */
export function InstallStandaloneRedirect() {
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) window.location.replace("/today");
  }, []);

  return null;
}
