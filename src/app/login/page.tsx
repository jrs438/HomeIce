"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Member = { id: string; name: string; role: string; color: string };

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"password" | "profile">("password");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Incorrect password");
        return;
      }
      const membersRes = await fetch("/api/auth/members");
      const list = (await membersRes.json()) as Member[];
      setMembers(list);
      setStep("profile");
    } finally {
      setLoading(false);
    }
  }

  async function selectProfile(memberId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/select-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) {
        setError("Could not select profile");
        return;
      }
      const next = params.get("next") ?? "/today";
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-6"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="text-center">
        <h1 className="masthead text-4xl">HOMEICE</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Family operations, one place.
        </p>
      </div>

      {step === "password" && (
        <form onSubmit={submitPassword} className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Family password"
            className="rounded-md border px-4 py-3 text-base"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
          />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="rounded-md px-4 py-3 font-semibold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      )}

      {step === "profile" && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Who&apos;s this?
          </p>
          {error && <p className="text-center text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            {members.map((m) => (
              <button
                key={m.id}
                disabled={loading}
                onClick={() => selectProfile(m.id)}
                className="flex flex-col items-center gap-2 rounded-lg border px-3 py-4 disabled:opacity-50"
                style={{ borderColor: m.color, background: "var(--bg-panel)" }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: m.color }}
                >
                  {m.name.slice(0, 1)}
                </span>
                <span className="text-sm font-medium">{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
