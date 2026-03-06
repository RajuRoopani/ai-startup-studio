"use client";

import { useState, useEffect } from "react";
import { listSessions } from "@/lib/api";
import type { SessionListItem } from "@/lib/api";
import Toast, { useToast } from "@/components/Toast";

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_META = {
  complete: { label: "Complete",  dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  running:  { label: "Running",   dot: "bg-amber-400 animate-pulse", text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25"  },
  pending:  { label: "Starting",  dot: "bg-slate-500",  text: "text-slate-500",  bg: "bg-slate-500/10",  border: "border-slate-500/25"  },
  failed:   { label: "Failed",    dot: "bg-red-500",    text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/25"    },
} as const;

function statusMeta(status: string) {
  return STATUS_META[status as keyof typeof STATUS_META] ?? STATUS_META.pending;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Session card ────────────────────────────────────────────────────────────

function SessionCard({ session, onCopyShare }: { session: SessionListItem; onCopyShare: (slug: string) => void }) {
  const sm = statusMeta(session.status);
  const isComplete = session.status === "complete";
  const isRunning  = session.status === "running" || session.status === "pending";

  return (
    <div className={`rounded-2xl border bg-surface-card transition-all hover:border-slate-600 ${isRunning ? "border-amber-500/30" : "border-surface-border"}`}>
      {/* Progress bar for running sessions */}
      {isRunning && (
        <div className="h-0.5 rounded-t-2xl bg-gradient-to-r from-brand-500/40 via-brand-500 to-brand-500/40 animate-pulse" />
      )}

      <div className="px-5 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-sm font-medium text-slate-200 leading-snug flex-1 line-clamp-3">{session.idea}</p>
          <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${sm.bg} ${sm.border} ${sm.text} font-medium`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
            {sm.label}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-slate-600 mb-4">
          <span>{relativeDate(session.created_at)}</span>
          {isComplete && session.artifact_count > 0 && (
            <span>· {session.artifact_count} artifacts</span>
          )}
          {isComplete && session.completed_at && (
            <span>· completed {relativeDate(session.completed_at)}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isComplete ? (
            <>
              <a
                href={`/output/${session.id}`}
                className="flex-1 text-center text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2 transition-all"
              >
                View Report →
              </a>
              {session.share_slug && (
                <button
                  onClick={() => onCopyShare(session.share_slug)}
                  className="text-xs text-slate-400 hover:text-slate-200 border border-surface-border hover:border-slate-500 rounded-xl px-3 py-2 transition-all"
                  title="Copy share link"
                >
                  🔗 Share
                </button>
              )}
            </>
          ) : isRunning ? (
            <a
              href={`/studio/${session.id}`}
              className="flex-1 text-center text-sm font-semibold border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 rounded-xl py-2 transition-all"
            >
              Watch Live →
            </a>
          ) : (
            <span className="text-xs text-slate-600">Session ended without completing</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-5 animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-full mb-2" />
      <div className="h-3 bg-slate-700 rounded w-3/4 mb-4" />
      <div className="h-3 bg-slate-700 rounded w-24 mb-5" />
      <div className="h-9 bg-slate-700 rounded-xl w-full" />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

type FilterStatus = "all" | "complete" | "running" | "failed";

export default function HistoryClient() {
  const { toast, show: showToast } = useToast();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const load = () => {
    setLoading(true);
    setError("");
    listSessions()
      .then(setSessions)
      .catch(() => setError("Failed to load history."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCopyShare = async (slug: string) => {
    const url = `${window.location.origin}/s/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const inp = document.createElement("input");
      inp.value = url;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand("copy");
      document.body.removeChild(inp);
    }
    showToast("Share link copied!", "success");
  };

  const counts = {
    all:      sessions.length,
    complete: sessions.filter(s => s.status === "complete").length,
    running:  sessions.filter(s => s.status === "running" || s.status === "pending").length,
    failed:   sessions.filter(s => s.status === "failed").length,
  };

  const filtered = filter === "all"
    ? sessions
    : filter === "running"
    ? sessions.filter(s => s.status === "running" || s.status === "pending")
    : sessions.filter(s => s.status === filter);

  return (
    <div className="min-h-screen bg-surface">
      <Toast message={toast?.message ?? ""} show={!!toast} type={toast?.type} />

      {/* Header */}
      <header className="border-b border-surface-border px-6 py-4 sticky top-0 z-40 bg-surface/95 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/" className="font-bold text-slate-100 hover:text-brand-500 transition-colors">
              🚀 AI Startup Studio
            </a>
            <span className="text-slate-700 hidden sm:block">·</span>
            <span className="text-sm text-slate-400 hidden sm:block">Analysis History</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/ideas" className="text-sm text-slate-400 hover:text-brand-400 transition-colors">
              🔭 Idea Radar
            </a>
            <span className="text-slate-700">·</span>
            <button
              onClick={load}
              disabled={loading}
              className="text-sm text-slate-400 hover:text-slate-200 border border-surface-border rounded-lg px-3 py-1.5 transition-all hover:bg-surface-hover disabled:opacity-40"
            >
              {loading ? "Loading…" : "↻ Refresh"}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-surface-border bg-gradient-to-br from-surface-card via-surface to-surface px-6 py-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 mb-4">
            📋 Analysis History
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-6">
            Every studio session you've run — complete reports, live sessions, and everything in between.
          </p>
          {!loading && sessions.length > 0 && (
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
              <span><span className="text-emerald-400 font-semibold">{counts.complete}</span> complete</span>
              {counts.running > 0 && <span><span className="text-amber-400 font-semibold">{counts.running}</span> running</span>}
              {counts.failed > 0 && <span><span className="text-red-400 font-semibold">{counts.failed}</span> failed</span>}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Filter tabs */}
        {!loading && sessions.length > 0 && (
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-1 bg-surface-card border border-surface-border rounded-xl p-1">
              {(["all", "complete", "running", "failed"] as const).map(f => (
                counts[f] > 0 || f === "all" ? (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all capitalize ${
                      filter === f ? "bg-brand-500 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f === "complete" && "✓ Complete"}
                    {f === "running"  && "⟳ In Progress"}
                    {f === "failed"   && "✗ Failed"}
                    {f === "all"      && "All"}
                    <span className={`text-xs ${filter === f ? "text-white/70" : "text-slate-600"}`}>
                      {counts[f]}
                    </span>
                  </button>
                ) : null
              ))}
            </div>
            <a
              href="/"
              className="text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-4 py-2 transition-all"
            >
              + New Analysis
            </a>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-3">{error}</p>
            <button onClick={load} className="text-sm text-slate-400 hover:text-slate-200 underline">Try again</button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-28">
            <div className="text-5xl mb-4">🏗️</div>
            <p className="text-slate-400 text-lg font-medium mb-2">No analyses yet</p>
            <p className="text-slate-600 text-sm mb-8 max-w-sm mx-auto">
              Submit a startup idea to run the 8-agent studio — or use the Idea Radar to find inspiration first.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="/" className="text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl transition-all">
                Run the Studio →
              </a>
              <a href="/ideas" className="text-sm text-slate-400 hover:text-slate-200 border border-surface-border px-5 py-2.5 rounded-xl transition-all">
                🔭 Idea Radar
              </a>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-600">
            No {filter} sessions.
            <button onClick={() => setFilter("all")} className="ml-2 text-brand-500 hover:text-brand-400 transition-colors">
              Show all
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(session => (
              <SessionCard key={session.id} session={session} onCopyShare={handleCopyShare} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
