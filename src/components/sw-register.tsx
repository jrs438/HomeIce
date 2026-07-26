"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Fire-and-forget: nudge the Gmail poll on app open so day-of forwards
    // land quickly instead of waiting for the next scheduled cron run.
    fetch("/api/gmail-poll-trigger", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
