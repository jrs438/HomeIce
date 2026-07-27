"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Camera, Send, Undo2, X } from "lucide-react";

type Outcome = { summary: string; applied: boolean; undoId?: string; undone?: boolean };

export function QuickAdd({ onApplied }: { onApplied?: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Start false to match the server's render (no `window` there), then
  // correct after mount — avoids a hydration mismatch on the mic button.
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setSpeechSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
    });
  }, []);

  async function submit(payload: { type: "text" | "image"; content: string }) {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setNote(data.error ?? "Could not process that");
        return;
      }
      if (data.status === "inbox") {
        setNote("Sent to Inbox for review" + (data.clarification ? ` — ${data.clarification}` : ""));
      } else if (data.clarification) {
        setNote(data.clarification);
      }
      setOutcomes(data.outcomes ?? []);
      setText("");
      if (data.status === "applied" && data.outcomes?.some((o: Outcome) => o.applied)) onApplied?.();
    } finally {
      setBusy(false);
    }
  }

  function dictate() {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void;
      start: () => void;
    };
    const Ctor = ((window as unknown as Record<string, unknown>).webkitSpeechRecognition ??
      (window as unknown as Record<string, unknown>).SpeechRecognition) as SpeechRecognitionCtor | undefined;
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  function attachPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") submit({ type: "image", content: reader.result });
    };
    reader.readAsDataURL(file);
  }

  async function undo(undoId: string) {
    const res = await fetch(`/api/undo/${undoId}`, { method: "POST" });
    if (res.ok) {
      setOutcomes((prev) => prev.map((o) => (o.undoId === undoId ? { ...o, undone: true } as Outcome : o)));
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text.trim() && submit({ type: "text", content: text.trim() })}
          placeholder="Type or say anything…"
          disabled={busy}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />
        {speechSupported && (
          <button
            onClick={dictate}
            className="rounded-full p-2"
            style={{ color: listening ? "var(--accent)" : "var(--text-muted)" }}
            aria-label="Dictate"
          >
            <Mic size={18} />
          </button>
        )}
        <button onClick={() => fileRef.current?.click()} className="rounded-full p-2" style={{ color: "var(--text-muted)" }} aria-label="Attach photo">
          <Camera size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && attachPhoto(e.target.files[0])}
        />
        <button
          onClick={() => text.trim() && submit({ type: "text", content: text.trim() })}
          disabled={busy || !text.trim()}
          className="rounded-full p-2 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>

      {busy && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Thinking…
        </p>
      )}

      {note && (
        <p className="text-xs" style={{ color: "var(--accent)" }}>
          {note}
        </p>
      )}

      {outcomes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {outcomes.map((o, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <span className={o.applied ? "" : "opacity-60"}>{o.summary}</span>
              {o.applied && o.undoId && !o.undone && (
                <button onClick={() => undo(o.undoId!)} className="flex shrink-0 items-center gap-1 font-semibold" style={{ color: "var(--accent)" }}>
                  <Undo2 size={12} /> Undo
                </button>
              )}
              {o.undone && <span style={{ color: "var(--text-muted)" }}>Undone</span>}
            </div>
          ))}
          <button
            onClick={() => setOutcomes([])}
            className="flex items-center gap-1 self-start text-[11px]"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={11} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
