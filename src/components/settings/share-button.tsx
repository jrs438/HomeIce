"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareButton({ familyName }: { familyName?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const appUrl = window.location.origin;
    const installUrl = `${appUrl}/install`;
    const text = `${familyName ? `${familyName} — ` : ""}Join us on HomeIce for our shared calendar, rides, and shopping list.\n\nTap the link below to add it to your Home Screen (10 seconds, with pictures):`;

    // Only ever share one link (the install page) so the preview card that
    // shows up in Messages/WhatsApp points at the instructions, not the bare
    // app root — a second, separate link here just confuses recipients.
    if (navigator.share) {
      try {
        await navigator.share({ title: "HomeIce", text, url: installUrl });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return;
    }

    await navigator.clipboard.writeText(`${text}\n${installUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={share}
      className="flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
      style={{ borderColor: "var(--border)" }}
    >
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? "Link copied!" : "Share HomeIce with family"}
    </button>
  );
}
