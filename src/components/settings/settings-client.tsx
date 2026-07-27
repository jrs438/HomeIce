"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Trash2, Pencil } from "lucide-react";
import type { SettingsKey } from "@/lib/settings";
import { ExternalDriversSection } from "./external-drivers-section";
import { PushToggle } from "./push-toggle";
import { IcsFeedsSection } from "./ics-feeds-section";
import { ShareButton } from "./share-button";

type Member = {
  id: string;
  name: string;
  role: "parent" | "kid" | "sitter";
  color: string;
  isAdmin: boolean;
  emails: string[];
  inviteEmail: string | null;
};

type ExternalDriver = {
  id: string;
  name: string;
  label: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type IcsFeed = { id: string; url: string; label: string; kind: "events" | "busy"; active: boolean };

const COLOR_PRESETS = [
  "#2563EB",
  "#DB2777",
  "#F59E0B",
  "#059669",
  "#7C3AED",
  "#0D9488",
  "#B45309",
  "#475569",
];

export function SettingsClient({
  initialMembers,
  initialExternalDrivers,
  initialIcsFeeds,
  initialSettings,
  isAdmin,
  currentMemberId,
}: {
  initialMembers: Member[];
  initialExternalDrivers: ExternalDriver[];
  initialIcsFeeds: IcsFeed[];
  initialSettings: Record<SettingsKey, string>;
  isAdmin: boolean;
  currentMemberId: string | null;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [settingsValues, setSettingsValues] = useState(initialSettings);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function saveMember(id: string, patch: Partial<Member>) {
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
    }
    setEditingId(null);
  }

  async function createMember(data: Omit<Member, "id">) {
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      setMembers((prev) => [...prev, created]);
    }
    setAdding(false);
  }

  async function deleteMember(id: string) {
    if (!confirm("Remove this member?")) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsValues),
      });
      if (res.ok) setSettingsValues(await res.json());
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="masthead text-2xl">SETTINGS</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Members, defaults, and integrations.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Members
          </h2>
          {isAdmin && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium"
              style={{ borderColor: "var(--border)" }}
            >
              <Plus size={14} /> Add
            </button>
          )}
        </div>

        <ul className="flex flex-col gap-2">
          {members.map((m) =>
            editingId === m.id ? (
              <MemberForm
                key={m.id}
                initial={m}
                onCancel={() => setEditingId(null)}
                onSubmit={(patch) => saveMember(m.id, patch)}
              />
            ) : (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: m.color }}
                  >
                    {m.name.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {m.name} {m.id === currentMemberId && <span style={{ color: "var(--text-muted)" }}>(you)</span>}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {m.role}
                      {m.isAdmin ? " · admin" : ""}
                      {m.emails.length ? ` · ${m.emails.join(", ")}` : ""}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => setEditingId(m.id)} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => deleteMember(m.id)} className="rounded p-1.5" style={{ color: "var(--danger)" }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            )
          )}
        </ul>

        {adding && (
          <MemberForm
            initial={{ id: "", name: "", role: "kid", color: "#2563EB", isAdmin: false, emails: [], inviteEmail: null }}
            onCancel={() => setAdding(false)}
            onSubmit={(data) => createMember(data as Omit<Member, "id">)}
          />
        )}
      </section>

      <ExternalDriversSection initial={initialExternalDrivers} isAdmin={isAdmin} />

      <IcsFeedsSection initial={initialIcsFeeds} isAdmin={isAdmin} />

      {isAdmin && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Family defaults
          </h2>
          <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
            <LabeledInput
              label="Family name"
              value={settingsValues.family_name}
              onChange={(v) => setSettingsValues((s) => ({ ...s, family_name: v }))}
            />
            <LabeledInput
              label="Family password"
              value={settingsValues.family_password}
              onChange={(v) => setSettingsValues((s) => ({ ...s, family_password: v }))}
            />
            <LabeledInput
              label="Sitter name"
              value={settingsValues.sitter_name}
              onChange={(v) => setSettingsValues((s) => ({ ...s, sitter_name: v }))}
            />
            <LabeledInput
              label="Candle-lighting zip"
              value={settingsValues.candle_lighting_zip}
              onChange={(v) => setSettingsValues((s) => ({ ...s, candle_lighting_zip: v }))}
            />
            <LabeledInput
              label="Digest day"
              value={settingsValues.digest_day}
              onChange={(v) => setSettingsValues((s) => ({ ...s, digest_day: v }))}
            />
            <LabeledInput
              label="Digest time"
              value={settingsValues.digest_time}
              onChange={(v) => setSettingsValues((s) => ({ ...s, digest_time: v }))}
            />
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="mt-2 self-start rounded-md px-3 py-1.5 text-sm font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              {savingSettings ? "Saving…" : "Save defaults"}
            </button>
          </div>
        </section>
      )}

      <ShareButton familyName={settingsValues.family_name} />

      <PushToggle />

      <button
        onClick={logout}
        className="flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
        style={{ borderColor: "var(--border)" }}
      >
        <LogOut size={16} /> Switch profile / sign out
      </button>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border px-3 py-2"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
    </label>
  );
}

function MemberForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: Member;
  onCancel: () => void;
  onSubmit: (patch: Partial<Member>) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [role, setRole] = useState(initial.role);
  const [color, setColor] = useState(initial.color);
  const [isAdmin, setIsAdmin] = useState(initial.isAdmin);
  const [emails, setEmails] = useState(initial.emails.join(", "));
  const [inviteEmail, setInviteEmail] = useState(initial.inviteEmail ?? "");

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--accent)", background: "var(--bg-panel)" }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      <div className="flex gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Member["role"])}
          className="flex-1 rounded-md border px-2 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          <option value="parent">Parent</option>
          <option value="kid">Kid</option>
          <option value="sitter">Sitter</option>
        </select>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          Admin
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="h-6 w-6 rounded-full"
            style={{ background: c, outline: color === c ? "2px solid var(--text)" : "none", outlineOffset: 2 }}
          />
        ))}
      </div>
      <input
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder="Emails, comma separated"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      <input
        value={inviteEmail}
        onChange={(e) => setInviteEmail(e.target.value)}
        placeholder="Ride invite email (optional)"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      <div className="flex gap-2">
        <button
          onClick={() =>
            onSubmit({
              name,
              role,
              color,
              isAdmin,
              emails: emails
                .split(",")
                .map((e) => e.trim())
                .filter(Boolean),
              inviteEmail: inviteEmail.trim() || null,
            })
          }
          disabled={!name}
          className="rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          Save
        </button>
        <button onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm" style={{ borderColor: "var(--border)" }}>
          Cancel
        </button>
      </div>
    </li>
  );
}
