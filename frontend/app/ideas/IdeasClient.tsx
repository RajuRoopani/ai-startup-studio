"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTrends, sparkIdeas, createSession } from "@/lib/api";
import type { TrendItem, SparkIdea } from "@/lib/api";
import Toast, { useToast } from "@/components/Toast";

// ─── Source metadata ───────────────────────────────────────────────────────

const SOURCE_META = {
  github: { label: "GitHub", icon: "⚡", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  hn:     { label: "Hacker News", icon: "▲", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-400" },
  arxiv:  { label: "AI Research", icon: "📄", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", dot: "bg-violet-400" },
} as const;

const IDEA_COLORS = [
  { accent: "text-brand-500",  ring: "ring-brand-500/40",  bg: "bg-brand-500/5",  border: "border-brand-500/25" },
  { accent: "text-emerald-400", ring: "ring-emerald-400/40", bg: "bg-emerald-400/5", border: "border-emerald-400/25" },
  { accent: "text-amber-400",   ring: "ring-amber-400/40",  bg: "bg-amber-400/5",  border: "border-amber-400/25" },
  { accent: "text-violet-400",  ring: "ring-violet-400/40", bg: "bg-violet-400/5", border: "border-violet-400/25" },
  { accent: "text-cyan-400",    ring: "ring-cyan-400/40",   bg: "bg-cyan-400/5",   border: "border-cyan-400/25" },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: TrendItem["source"] }) {
  const m = SOURCE_META[source];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${m.bg} ${m.border} border ${m.color} font-medium`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function TrendCard({
  trend,
  selected,
  onToggle,
}: {
  trend: TrendItem;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-full text-left rounded-xl border p-4 transition-all duration-200 relative
        ${selected
          ? "border-brand-500/60 bg-brand-500/5 ring-1 ring-brand-500/30"
          : "border-surface-border bg-surface-card hover:border-surface-border/80 hover:bg-surface-hover"
        }
      `}
    >
      {/* Selection indicator */}
      <div className={`
        absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
        ${selected ? "border-brand-500 bg-brand-500" : "border-slate-600"}
      `}>
        {selected && <span className="text-white text-xs font-bold">✓</span>}
      </div>

      <div className="pr-7">
        <div className="flex items-start gap-2 mb-2">
          <SourceBadge source={trend.source} />
        </div>
        <p className="text-sm font-semibold text-slate-100 leading-snug mb-1.5 line-clamp-2">
          {trend.title}
        </p>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-2">
          {trend.description}
        </p>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${SOURCE_META[trend.source].color}`}>
            {trend.signal}
          </span>
        </div>
        {trend.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {trend.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-surface-hover rounded text-slate-500">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function IdeaCard({
  idea,
  index,
  onLaunch,
  launching,
}: {
  idea: SparkIdea;
  index: number;
  onLaunch: () => void;
  launching: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = IDEA_COLORS[index % IDEA_COLORS.length];

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
              <span className={`text-sm font-bold ${colors.accent}`}>{index + 1}</span>
            </div>
            <div>
              <h3 className={`text-lg font-bold ${colors.accent}`}>{idea.name}</h3>
              <p className="text-sm text-slate-300 mt-0.5">{idea.tagline}</p>
            </div>
          </div>
          <button
            onClick={onLaunch}
            disabled={launching}
            className={`
              shrink-0 flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all
              ${launching
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-brand-500 hover:bg-brand-600 text-white"
              }
            `}
          >
            {launching ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                Starting…
              </>
            ) : (
              <>Launch Studio →</>
            )}
          </button>
        </div>
      </div>

      {/* Core info */}
      <div className="px-6 py-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">The Problem</p>
          <p className="text-sm text-slate-300 leading-relaxed">{idea.problem}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">The Solution</p>
          <p className="text-sm text-slate-300 leading-relaxed">{idea.solution}</p>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
        >
          {expanded ? "▾ Hide details" : "▸ Market · Revenue · Why Now"}
        </button>

        {expanded && (
          <div className="space-y-3 pt-1 border-t border-white/5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Why Now</p>
              <p className="text-sm text-slate-400 leading-relaxed">{idea.why_now}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Market</p>
                <p className="text-sm text-slate-400 leading-relaxed">{idea.market}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Revenue</p>
                <p className="text-sm text-slate-400 leading-relaxed">{idea.revenue}</p>
              </div>
            </div>
            {idea.inspiration.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Inspired By</p>
                <div className="flex flex-wrap gap-1.5">
                  {idea.inspiration.map((t) => (
                    <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} border ${colors.border} ${colors.accent}`}>
                      {t.slice(0, 50)}{t.length > 50 ? "…" : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function IdeasClient() {
  const router = useRouter();
  const { toast, show: showToast } = useToast();

  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [trendError, setTrendError] = useState("");
  const [activeSource, setActiveSource] = useState<"all" | "github" | "hn" | "arxiv">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [sparking, setSparking] = useState(false);
  const [ideas, setIdeas] = useState<SparkIdea[]>([]);
  const [launchingIdx, setLaunchingIdx] = useState<number | null>(null);

  // Load trends on mount
  useEffect(() => {
    getTrends()
      .then(setTrends)
      .catch(() => setTrendError("Failed to load trend signals. Check your connection."))
      .finally(() => setLoadingTrends(false));
  }, []);

  const refreshTrends = () => {
    setLoadingTrends(true);
    setTrendError("");
    setSelectedIds(new Set());
    getTrends()
      .then(setTrends)
      .catch(() => setTrendError("Failed to load trend signals."))
      .finally(() => setLoadingTrends(false));
  };

  const filteredTrends = activeSource === "all"
    ? trends
    : trends.filter((t) => t.source === activeSource);

  const sourceCounts = {
    all: trends.length,
    github: trends.filter((t) => t.source === "github").length,
    hn: trends.filter((t) => t.source === "hn").length,
    arxiv: trends.filter((t) => t.source === "arxiv").length,
  };

  const toggleTrend = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredTrends.map((t) => t.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleSparkIdeas = async () => {
    const selected = trends.filter((t) => selectedIds.has(t.id));
    if (!selected.length) {
      showToast("Select at least one trend signal first", "error");
      return;
    }
    setSparking(true);
    setIdeas([]);
    try {
      const generated = await sparkIdeas(selected);
      setIdeas(generated);
      // Scroll to ideas
      setTimeout(() => {
        document.getElementById("ideas-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate ideas", "error");
    } finally {
      setSparking(false);
    }
  };

  const handleLaunchStudio = async (idea: SparkIdea, idx: number) => {
    setLaunchingIdx(idx);
    try {
      const pitch = `${idea.name}: ${idea.tagline}\n\nProblem: ${idea.problem}\n\nSolution: ${idea.solution}`;
      const session = await createSession(pitch);
      router.push(`/studio/${session.session_id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to start studio", "error");
      setLaunchingIdx(null);
    }
  };

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
            <span className="text-sm text-slate-400 hidden sm:block">Idea Radar</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshTrends}
              disabled={loadingTrends}
              className="text-sm text-slate-400 hover:text-slate-200 border border-surface-border rounded-lg px-3 py-1.5 transition-all hover:bg-surface-hover disabled:opacity-40"
            >
              {loadingTrends ? "Loading…" : "↻ Refresh"}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-surface-border bg-gradient-to-br from-surface-card via-surface to-surface px-6 py-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 rounded-full px-4 py-1.5 mb-5">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-slow" />
            <span className="text-xs font-medium text-brand-500">
              Live signals · GitHub · Hacker News · AI Research
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 mb-4">
            🔭 Startup Idea Radar
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Scan what's trending across tech right now. Select the signals that excite you.
            Let Claude synthesise them into your next $1B startup.
          </p>

          {/* Stats */}
          {!loadingTrends && trends.length > 0 && (
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-500">
              <span>
                <span className="text-emerald-400 font-semibold">{sourceCounts.github}</span> GitHub repos
              </span>
              <span>
                <span className="text-orange-400 font-semibold">{sourceCounts.hn}</span> HN stories
              </span>
              <span>
                <span className="text-violet-400 font-semibold">{sourceCounts.arxiv}</span> AI papers
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Source tabs + selection controls */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-1 bg-surface-card border border-surface-border rounded-xl p-1">
            {(["all", "github", "hn", "arxiv"] as const).map((src) => (
              <button
                key={src}
                onClick={() => setActiveSource(src)}
                className={`
                  flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all
                  ${activeSource === src
                    ? "bg-brand-500 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                  }
                `}
              >
                {src === "all" && "All"}
                {src === "github" && <><span className="text-emerald-400">⚡</span> GitHub</>}
                {src === "hn" && <><span className="text-orange-400">▲</span> Hacker News</>}
                {src === "arxiv" && <><span className="text-violet-400">📄</span> AI Research</>}
                <span className={`text-xs ${activeSource === src ? "text-white/70" : "text-slate-600"}`}>
                  {sourceCounts[src]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-xs text-slate-500">
                <span className="text-brand-500 font-semibold">{selectedIds.size}</span> selected
              </span>
            )}
            <button onClick={selectAll} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Select all
            </button>
            {selectedIds.size > 0 && (
              <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                · Clear
              </button>
            )}
          </div>
        </div>

        {/* Trend grid */}
        {loadingTrends ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-surface-border bg-surface-card p-4 animate-pulse">
                <div className="h-3 bg-slate-700 rounded w-16 mb-3" />
                <div className="h-4 bg-slate-700 rounded w-full mb-2" />
                <div className="h-3 bg-slate-700 rounded w-4/5 mb-2" />
                <div className="h-3 bg-slate-700 rounded w-3/5" />
              </div>
            ))}
          </div>
        ) : trendError ? (
          <div className="text-center py-16">
            <p className="text-red-400 mb-3">{trendError}</p>
            <button onClick={refreshTrends} className="text-sm text-slate-400 hover:text-slate-200 underline">
              Try again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredTrends.map((trend) => (
              <TrendCard
                key={trend.id}
                trend={trend}
                selected={selectedIds.has(trend.id)}
                onToggle={() => toggleTrend(trend.id)}
              />
            ))}
          </div>
        )}

        {/* Spark Ideas CTA */}
        {!loadingTrends && trends.length > 0 && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={handleSparkIdeas}
              disabled={sparking || selectedIds.size === 0}
              className={`
                flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all
                ${selectedIds.size === 0
                  ? "bg-surface-card border border-surface-border text-slate-500 cursor-not-allowed"
                  : sparking
                  ? "bg-brand-600 text-white cursor-wait"
                  : "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30"
                }
              `}
            >
              {sparking ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analysing {selectedIds.size} trend{selectedIds.size !== 1 ? "s" : ""} with Claude Opus…
                </>
              ) : (
                <>
                  ✦ Spark Ideas
                  {selectedIds.size > 0 && (
                    <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm">
                      {selectedIds.size} signal{selectedIds.size !== 1 ? "s" : ""}
                    </span>
                  )}
                </>
              )}
            </button>
            {selectedIds.size === 0 && (
              <p className="text-xs text-slate-600">Select at least one trend signal above</p>
            )}
            {sparking && (
              <p className="text-xs text-slate-500 animate-pulse">
                Synthesising trends → identifying market gaps → generating startup concepts…
              </p>
            )}
          </div>
        )}

        {/* Generated ideas */}
        {ideas.length > 0 && (
          <div id="ideas-section" className="mt-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-surface-border" />
              <div className="flex items-center gap-2">
                <span className="text-xl">✦</span>
                <h2 className="text-lg font-bold text-slate-100">
                  {ideas.length} Startup Ideas
                </h2>
                <span className="text-sm text-slate-500">from {selectedIds.size} trend signals</span>
              </div>
              <div className="h-px flex-1 bg-surface-border" />
            </div>

            <div className="space-y-5">
              {ideas.map((idea, i) => (
                <IdeaCard
                  key={i}
                  idea={idea}
                  index={i}
                  onLaunch={() => handleLaunchStudio(idea, i)}
                  launching={launchingIdx === i}
                />
              ))}
            </div>

            <div className="mt-8 p-5 rounded-2xl border border-surface-border bg-surface-card text-center">
              <p className="text-sm text-slate-400 mb-3">
                Have your own idea that's not on the list?
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-500 hover:text-brand-400 transition-colors"
              >
                Run the full studio with any idea →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
