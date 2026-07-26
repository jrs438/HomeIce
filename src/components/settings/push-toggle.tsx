"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushToggle() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  // Assume supported on the initial (server-matching) render to avoid a
  // hydration mismatch; correct it after mount if the browser lacks the APIs.
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      const actuallySupported = "serviceWorker" in navigator && "PushManager" in window;
      if (!actuallySupported) {
        if (!cancelled) setSupported(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled) setSubscribed(!!sub);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const { publicKey } = await fetch("/api/push/vapid-public-key").then((r) => r.json());
      if (!publicKey) {
        alert("Push isn't configured on the server yet.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await sub?.unsubscribe();
      await fetch("/api/push/unsubscribe", { method: "POST" });
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <button
      onClick={subscribed ? disable : enable}
      disabled={busy || subscribed === null}
      className="flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
      style={{ borderColor: "var(--border)" }}
    >
      {subscribed ? <BellOff size={16} /> : <Bell size={16} />}
      {subscribed ? "Disable push notifications" : "Enable push notifications"}
    </button>
  );
}
