"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Car } from "lucide-react";

type ExternalDriver = {
  id: string;
  name: string;
  label: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

export function ExternalDriversSection({
  initial,
  isAdmin,
}: {
  initial: ExternalDriver[];
  isAdmin: boolean;
}) {
  const [drivers, setDrivers] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function save(id: string, patch: Partial<ExternalDriver>) {
    const res = await fetch(`/api/external-drivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setDrivers((prev) => prev.map((d) => (d.id === id ? updated : d)));
    }
    setEditingId(null);
  }

  async function create(data: Omit<ExternalDriver, "id">) {
    const res = await fetch("/api/external-drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      setDrivers((prev) => [...prev, created]);
    }
    setAdding(false);
  }

  async function remove(id: string) {
    if (!confirm("Remove this driver?")) return;
    const res = await fetch(`/api/external-drivers/${id}`, { method: "DELETE" });
    if (res.ok) setDrivers((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          External drivers
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
        {drivers.map((d) =>
          editingId === d.id ? (
            <DriverForm key={d.id} initial={d} onCancel={() => setEditingId(null)} onSubmit={(patch) => save(d.id, patch)} />
          ) : (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--person-external)", background: "var(--bg-panel)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full border"
                  style={{ borderColor: "var(--person-external)" }}
                >
                  <Car size={15} style={{ color: "var(--person-external)" }} />
                </span>
                <div>
                  <p className="text-sm font-semibold">{d.label}</p>
                  {(d.phone || d.email) && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {[d.phone, d.email].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <button onClick={() => setEditingId(d.id)} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => remove(d.id)} className="rounded p-1.5" style={{ color: "var(--danger)" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </li>
          )
        )}
      </ul>

      {adding && (
        <DriverForm
          initial={{ id: "", name: "", label: "", phone: null, email: null, notes: null }}
          onCancel={() => setAdding(false)}
          onSubmit={(data) => create(data as Omit<ExternalDriver, "id">)}
        />
      )}
    </section>
  );
}

function DriverForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: ExternalDriver;
  onCancel: () => void;
  onSubmit: (patch: Partial<ExternalDriver>) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [label, setLabel] = useState(initial.label);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [email, setEmail] = useState(initial.email ?? "");

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--accent)", background: "var(--bg-panel)" }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (e.g. Grandma)"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label shown on pucks (defaults to name)"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional)"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (optional, for ride invites)"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      <div className="flex gap-2">
        <button
          onClick={() =>
            onSubmit({ name, label: label || name, phone: phone.trim() || null, email: email.trim() || null })
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
