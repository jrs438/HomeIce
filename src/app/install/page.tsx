import type { Metadata } from "next";
import { InstallStandaloneRedirect } from "./standalone-redirect";

export const metadata: Metadata = {
  title: "Add HomeIce to your Home Screen",
  description: "Takes about 10 seconds — add HomeIce to your Home Screen like a regular app.",
  openGraph: {
    title: "Add HomeIce to your Home Screen",
    description: "Takes about 10 seconds — add HomeIce to your Home Screen like a regular app.",
    images: ["/icons/icon-512.png"],
  },
  twitter: {
    card: "summary",
    title: "Add HomeIce to your Home Screen",
    images: ["/icons/icon-512.png"],
  },
};

function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function MenuDotsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function Step({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm" style={{ color: "var(--text)" }}>
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: "var(--border, #e5e0d5)", color: "var(--accent)", background: "var(--bg-panel)" }}
      >
        {icon}
      </span>
      <span className="pt-1.5">{children}</span>
    </li>
  );
}

export default function InstallPage() {
  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-8 px-5 py-10"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <InstallStandaloneRedirect />
      <div>
        <p className="masthead text-2xl">HOMEICE</p>
        <h1 className="mt-2 text-lg font-semibold">Add HomeIce to your Home Screen</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Takes about 10 seconds — it&rsquo;ll open and feel just like a regular app, no App Store needed.
        </p>
      </div>

      <section
        className="flex flex-col gap-4 rounded-lg border p-4"
        style={{ borderColor: "var(--border, #e5e0d5)", background: "var(--bg-panel)" }}
      >
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          iPhone / iPad (Safari)
        </h2>
        <ol className="flex flex-col gap-4">
          <Step icon={<ShareIcon />}>
            Tap the <strong>Share</strong> button (the square with an arrow pointing up) in Safari&rsquo;s toolbar.
          </Step>
          <Step icon={<PlusSquareIcon />}>
            Scroll down the menu and tap <strong>Add to Home Screen</strong>.
          </Step>
          <Step icon={<span className="text-sm font-bold">✓</span>}>
            Tap <strong>Add</strong> in the top right. HomeIce now has its own icon on your Home Screen.
          </Step>
        </ol>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Note: this only works in Safari, not Chrome or other browsers on iPhone/iPad.
        </p>
      </section>

      <section
        className="flex flex-col gap-4 rounded-lg border p-4"
        style={{ borderColor: "var(--border, #e5e0d5)", background: "var(--bg-panel)" }}
      >
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Android (Chrome)
        </h2>
        <ol className="flex flex-col gap-4">
          <Step icon={<MenuDotsIcon />}>
            Tap the <strong>⋮ menu</strong> (three dots) in the top right of Chrome.
          </Step>
          <Step icon={<PlusSquareIcon />}>
            Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>, depending on your version).
          </Step>
          <Step icon={<span className="text-sm font-bold">✓</span>}>
            Confirm by tapping <strong>Add</strong> / <strong>Install</strong>.
          </Step>
        </ol>
      </section>

      <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
        Already added it? You can close this page and open HomeIce from your Home Screen anytime.
      </p>
    </main>
  );
}
