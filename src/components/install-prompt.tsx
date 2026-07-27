"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function wasDismissed(key: string): boolean {
  return typeof window !== "undefined" && localStorage.getItem(key) === "1";
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => wasDismissed("hi-install-dismissed"));
  const [showIosHint, setShowIosHint] = useState(
    () => isIosSafari() && !isStandalone() && !wasDismissed("hi-ios-install-dismissed")
  );

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("hi-install-dismissed", "1");
    setDismissed(true);
  }

  function dismissIos() {
    localStorage.setItem("hi-ios-install-dismissed", "1");
    setShowIosHint(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (deferred && !dismissed) {
    return (
      <div
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-4 py-2 text-sm"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}
      >
        <span>Install HomeIce for quick access from your home screen.</span>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={install} className="flex items-center gap-1 rounded-full bg-black/10 px-3 py-1 font-semibold">
            <Download size={14} /> Install
          </button>
          <button onClick={dismiss} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-4 py-2 text-sm"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}
      >
        <span className="flex items-center gap-1">
          Add HomeIce to your Home Screen: tap <Share size={14} /> then &quot;Add to Home Screen&quot;.
        </span>
        <button onClick={dismissIos} aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}
