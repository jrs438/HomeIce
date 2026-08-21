"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Car, X, RefreshCw, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Modal } from "@/components/modal";

type Kid = { id: string; name: string; color: string };
type IcsFeed = {
  id: string;
  url: string;
  label: string;
  kind: "events" | "busy";
  kidIds: string[];
  needsDropoff: boolean;
  needsPickup: boolean;
  skipKeywords: string[];
  onlyKeywords: string[];
  active: boolean;
};

type FeedDraft = Omit<IcsFeed, "id" | "active">;

type SyncResult = {
  created: number;
  updated: number;
  skipped: number;
  restored: number;
  ridesCreated: number;
  errors: string[];
};

export function IcsFeedsSection({
  initial,
  kids,
  isAdmin,
}: {
  initial: IcsFeed[];
  kids: Kid[];
  isAdmin: boolean;
}) {
  const [feeds, setFeeds] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [deletingFeed, setDeletingFeed] = useState<IcsFeed | null>(null);

  async function create(draft: FeedDraft) {
    const res = await fetch("/api/ics-feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const created = await res.json();
      setFeeds((prev) => [...prev, created]);
    }
    setAdding(false);
  }

  async function save(id: string, draft: FeedDraft) {
    const res = await fetch(`/api/ics-feeds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const updated = await res.json();
      setFeeds((prev) => prev.map((f) => (f.id === id ? updated : f)));
    }
    setEditingId(null);
  }

  async function removeKeepEvents(id: string) {
    const res = await fetch(`/api/ics-feeds/${id}`, { method: "DELETE" });
    if (res.ok) setFeeds((prev) => prev.filter((f) => f.id !== id));
    setDeletingFeed(null);
  }

  async function purge(id: string) {
    const res = await fetch(`/api/ics-feeds/${id}/purge`, { method: "POST" });
    if (res.ok) setFeeds((prev) => prev.filter((f) => f.id !== id));
    setDeletingFeed(null);
  }

  async function syncNow() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/ics-feeds/poll", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      const refreshed = await fetch("/api/ics-feeds").then((r) => r.json());
      setFeeds(refreshed);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Calendar feeds (ICS)
        </h2>
        <div className="flex gap-1.5">
          {feeds.length > 0 && (
            <button
              onClick={syncNow}
              disabled={syncing}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50"
              style={{ borderColor: "var(--border)" }}
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync now"}
            </button>
          )}
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
      </div>

      {syncResult && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {syncResult.created} new, {syncResult.skipped} skipped by filter, {syncResult.updated} updated
          {syncResult.restored ? `, ${syncResult.restored} restored` : ""}
          {syncResult.ridesCreated ? `, ${syncResult.ridesCreated} ride(s) created` : ""}.
          {syncResult.errors.length > 0 && ` Errors: ${syncResult.errors.join("; ")}`}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {feeds.map((f) =>
          editingId === f.id ? (
            <FeedForm key={f.id} initial={f} kids={kids} onCancel={() => setEditingId(null)} onSubmit={(draft) => save(f.id, draft)} />
          ) : (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                  {f.kind === "busy" ? "Busy overlay" : "Events"}
                  {f.kind !== "busy" && (f.needsDropoff || f.needsPickup) && (
                    <>
                      {" · "}
                      <Car size={11} className="inline -mt-0.5" />{" "}
                      {[f.needsDropoff && "drop-off", f.needsPickup && "pick-up"].filter(Boolean).join(" + ")} needed
                    </>
                  )}
                </p>
                {f.kind !== "busy" && f.kidIds.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {f.kidIds.map((kidId) => {
                      const kid = kids.find((k) => k.id === kidId);
                      if (!kid) return null;
                      return (
                        <span
                          key={kidId}
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                          style={{ background: kid.color }}
                        >
                          {kid.name}
                        </span>
                      );
                    })}
                  </div>
                )}
                {f.kind !== "busy" && (f.skipKeywords.length > 0 || f.onlyKeywords.length > 0) && (
                  <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {f.skipKeywords.length > 0 && `Skipping: ${f.skipKeywords.join(", ")}`}
                    {f.skipKeywords.length > 0 && f.onlyKeywords.length > 0 && " · "}
                    {f.onlyKeywords.length > 0 && `Only: ${f.onlyKeywords.join(", ")}`}
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditingId(f.id)} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeletingFeed(f)} className="rounded p-1.5" style={{ color: "var(--danger)" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </li>
          )
        )}
      </ul>

      {adding && (
        <FeedForm
          initial={{
            url: "",
            label: "",
            kind: "events",
            kidIds: [],
            needsDropoff: false,
            needsPickup: false,
            skipKeywords: [],
            onlyKeywords: [],
          }}
          kids={kids}
          onCancel={() => setAdding(false)}
          onSubmit={create}
        />
      )}

      {feeds.length > 0 && <CancelledEventsList />}

      {deletingFeed && (
        <DeleteFeedModal
          feed={deletingFeed}
          onClose={() => setDeletingFeed(null)}
          onKeepEvents={() => removeKeepEvents(deletingFeed.id)}
          onPurge={() => purge(deletingFeed.id)}
        />
      )}
    </section>
  );
}

function DeleteFeedModal({
  feed,
  onClose,
  onKeepEvents,
  onPurge,
}: {
  feed: IcsFeed;
  onClose: () => void;
  onKeepEvents: () => void;
  onPurge: () => void;
}) {
  const [busy, setBusy] = useState<"keep" | "purge" | null>(null);

  return (
    <Modal title={`Remove "${feed.label}"`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <button
          onClick={async () => {
            setBusy("keep");
            await onKeepEvents();
          }}
          disabled={busy !== null}
          className="flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-sm font-semibold">{busy === "keep" ? "Removing…" : "Just stop syncing"}</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Removes the feed subscription. Everything it already imported — confirmed and cancelled — stays on your calendar.
          </span>
        </button>

        <button
          onClick={async () => {
            setBusy("purge");
            await onPurge();
          }}
          disabled={busy !== null}
          className="flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left disabled:opacity-50"
          style={{ borderColor: "var(--danger)", background: "var(--danger)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "#fff" }}>
            {busy === "purge" ? "Deleting…" : "Delete everything from this feed"}
          </span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
            Also permanently deletes every event this feed ever imported (and any linked ride) — use this for a clean restart, e.g. after a
            trial run. Can&rsquo;t be undone.
          </span>
        </button>

        <button onClick={onClose} disabled={busy !== null} className="self-start text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

type CancelledEvent = { id: string; title: string; start: string; location: string | null; feedId: string | null; feedLabel: string | null };

// Deliberately not scoped to any one feed — deleting and re-adding a feed
// (even with the same URL) gives it a new id, which would otherwise orphan
// its previously-cancelled events from any recovery path. This looks across
// all feeds (and events whose feed no longer exists at all) in one place.
function CancelledEventsList() {
  const [expanded, setExpanded] = useState(false);
  const [cancelled, setCancelled] = useState<CancelledEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && cancelled === null) {
      setLoading(true);
      try {
        const data = await fetch("/api/ics-events/cancelled").then((r) => r.json());
        setCancelled(data);
      } finally {
        setLoading(false);
      }
    }
  }

  async function restore(eventId: string) {
    setRestoringId(eventId);
    try {
      const res = await fetch(`/api/ics-events/cancelled/${eventId}/restore`, { method: "POST" });
      if (res.ok) setCancelled((prev) => (prev ? prev.filter((e) => e.id !== eventId) : prev));
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={toggle} className="flex items-center gap-1 self-start text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Cancelled events{cancelled ? ` (${cancelled.length})` : ""}
      </button>

      {expanded && (
        <div className="flex flex-col gap-1.5 rounded-md border p-2" style={{ borderColor: "var(--border)" }}>
          {loading && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Loading…
            </p>
          )}
          {!loading && cancelled?.length === 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Nothing cancelled.
            </p>
          )}
          {cancelled?.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">
                {e.title} — {new Date(e.start).toLocaleDateString()}
                <span style={{ color: "var(--text-muted)" }}>
                  {" · "}
                  {e.feedLabel ?? "feed no longer configured"}
                </span>
              </span>
              <button
                onClick={() => restore(e.id)}
                disabled={restoringId === e.id}
                className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 font-semibold disabled:opacity-50"
                style={{ borderColor: "var(--border)" }}
              >
                <RotateCcw size={11} /> {restoringId === e.id ? "Restoring…" : "Restore"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; matchCount: number; totalEvents: number; matches: { summary: string; start: string }[] };

function KeywordList({
  label,
  hint,
  placeholder,
  keywords,
  onChange,
  feedUrl,
}: {
  label: string;
  hint: string;
  placeholder: string;
  keywords: string[];
  onChange: (next: string[]) => void;
  feedUrl: string;
}) {
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });

  useEffect(() => {
    const query = draft.trim();
    if (!query || !feedUrl.trim()) return;

    const timer = setTimeout(async () => {
      setPreview({ status: "loading" });
      try {
        const res = await fetch("/api/ics-feeds/preview-filter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: feedUrl, query }),
        });
        const data = await res.json();
        if (!res.ok) setPreview({ status: "error", message: data.error ?? "Couldn't check that feed" });
        else setPreview({ status: "done", matchCount: data.matchCount, totalEvents: data.totalEvents, matches: data.matches });
      } catch {
        setPreview({ status: "error", message: "Couldn't reach that feed" });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, feedUrl]);

  // Hide stale/previous results the moment the box is cleared, without a
  // synchronous setState in the effect above — `preview` itself just keeps
  // its last value until the next debounced query resolves.
  const showPreview = draft.trim().length > 0 && feedUrl.trim().length > 0;

  function add() {
    const phrase = draft.trim();
    if (!phrase || keywords.includes(phrase)) return;
    onChange([...keywords, phrase]);
    setDraft("");
    setPreview({ status: "idle" });
  }

  return (
    <div>
      <p className="mb-1 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {keywords.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              {kw}
              <button type="button" onClick={() => onChange(keywords.filter((k) => k !== kw))} aria-label={`Remove ${kw}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="w-0 flex-1 rounded-md border px-2.5 py-1.5 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />
        <button
          type="button"
          onClick={add}
          className="rounded-md border px-2.5 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--border)" }}
        >
          Add
        </button>
      </div>

      {showPreview && preview.status === "loading" && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
          Checking the feed…
        </p>
      )}
      {showPreview && preview.status === "error" && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--danger)" }}>
          {preview.message}
        </p>
      )}
      {showPreview && preview.status === "done" && (
        <div className="mt-1 text-[11px]" style={{ color: preview.matchCount > 0 ? "var(--accent)" : "var(--text-muted)" }}>
          {preview.matchCount === 0
            ? `No matches in the ${preview.totalEvents} upcoming event(s) on this feed — try different words.`
            : `Matches ${preview.matchCount} of ${preview.totalEvents} event(s): ${preview.matches.map((m) => m.summary).join(", ")}${
                preview.matchCount > preview.matches.length ? "…" : ""
              }`}
        </div>
      )}

      <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        {hint}
      </p>
    </div>
  );
}

function FeedForm({
  initial,
  kids,
  onCancel,
  onSubmit,
}: {
  initial: FeedDraft;
  kids: Kid[];
  onCancel: () => void;
  onSubmit: (draft: FeedDraft) => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [url, setUrl] = useState(initial.url);
  const [kind, setKind] = useState<"events" | "busy">(initial.kind);
  const [kidIds, setKidIds] = useState<string[]>(initial.kidIds);
  const [needsDropoff, setNeedsDropoff] = useState(initial.needsDropoff);
  const [needsPickup, setNeedsPickup] = useState(initial.needsPickup);
  const [skipKeywords, setSkipKeywords] = useState<string[]>(initial.skipKeywords);
  const [onlyKeywords, setOnlyKeywords] = useState<string[]>(initial.onlyKeywords);

  function toggleKid(id: string) {
    setKidIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--accent)", background: "var(--bg-panel)" }}>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. Jonah's school calendar)"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="ICS feed URL"
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as "events" | "busy")}
        className="rounded-md border px-2 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <option value="events">Events feed</option>
        <option value="busy">Busy overlay only (e.g. Outlook availability)</option>
      </select>

      {kind === "events" && kids.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            Whose calendar is this?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {kids.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => toggleKid(k.id)}
                className="rounded-full border px-2.5 py-1 text-xs font-medium"
                style={{
                  borderColor: k.color,
                  background: kidIds.includes(k.id) ? k.color : "transparent",
                  color: kidIds.includes(k.id) ? "#fff" : k.color,
                }}
              >
                {k.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {kind === "events" && (
        <div className="rounded-md border p-2" style={{ borderColor: "var(--border)" }}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Rides
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={needsDropoff} onChange={(e) => setNeedsDropoff(e.target.checked)} />
            Create an unassigned drop-off ride for each new event
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={needsPickup} onChange={(e) => setNeedsPickup(e.target.checked)} />
            Create an unassigned pick-up ride for each new event
          </label>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Leave both off for calendars that are just informational (test/exam schedules, etc.) — no ride needed.
          </p>
        </div>
      )}

      {kind === "events" && (
        <div className="flex flex-col gap-3 rounded-md border p-2" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Filter what comes in
          </p>
          <KeywordList
            label="Skip anything containing"
            hint='Describe it in your own words, like "Tuesday nights at Davis Center" — matched loosely against the title, location, and description, so it doesn’t need to be exact.'
            placeholder="e.g. Tuesday nights at Davis Center"
            keywords={skipKeywords}
            onChange={setSkipKeywords}
            feedUrl={url}
          />
          <KeywordList
            label="Only include events containing"
            hint='Leave empty to bring in everything (minus what’s skipped above). Add a phrase like "5th Grade" to only pull in matching events.'
            placeholder="e.g. 5th Grade"
            keywords={onlyKeywords}
            onChange={setOnlyKeywords}
            feedUrl={url}
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onSubmit({ label, url, kind, kidIds, needsDropoff, needsPickup, skipKeywords, onlyKeywords })}
          disabled={!label || !url}
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
