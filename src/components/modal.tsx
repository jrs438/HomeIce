"use client";

import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border sm:rounded-2xl"
        style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}
      >
        <div
          className="sticky top-0 flex items-center justify-between border-b px-4 py-3"
          style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {title}
          </h2>
          <button onClick={onClose} className="rounded p-1" style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
