"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTrends, sparkIdeas, createSession, getIdeasHistory, resolveTrendUrl } from "@/lib/api";
import type { TrendItem, SparkIdea, IdeaRecord } from "@/lib/api";
import Toast, { useToast } from "@/components/Toast";

// ─── Source metadata ────────────────────────────────────────────────────────

const SOURCE_META = {
  github:  { label: "GitHub",           icon: "⚡", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  hn:      { label: "Hacker News",      icon: "▲",  color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  dot: "bg-orange-400"  },
  arxiv:   { label: "AI Research",      icon: "📄", color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/30",  dot: "bg-violet-400"  },
  reddit:  { label: "Reddit AI",        icon: "🔴", color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    dot: "bg-rose-400"    },
  scholar: { label: "Semantic Scholar", icon: "📚", color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    dot: "bg-cyan-400"    },
  saas:    { label: "SaaS & Indie",     icon: "💸", color: "text-lime-400",    bg: "bg-lime-500/10",    border: "border-lime-500/30",    dot: "bg-lime-400"    },
  devto:   { label: "Dev.to",           icon: "🖊", color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/30",     dot: "bg-sky-400"     },
} as const;

const IDEA_COLORS = [
  { accent: "text-brand-500",   bg: "bg-brand-500/5",   border: "border-brand-500/25"  },
  { accent: "text-emerald-400", bg: "bg-emerald-400/5", border: "border-emerald-400/25" },
  { accent: "text-amber-400",   bg: "bg-amber-400/5",   border: "border-amber-400/25"  },
  { accent: "text-violet-400",  bg: "bg-violet-400/5",  border: "border-violet-400/25"  },
  { accent: "text-cyan-400",    bg: "bg-cyan-400/5",    border: "border-cyan-400/25"   },
];

// ─── Shared sub-components ───────────────────────────────────────────────────

function SourceBadge({ source }: { source: TrendItem["source"] }) {
  const m = SOURCE_META[source];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${m.bg} ${m.border} border ${m.color} font-medium`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function sourceLinkLabel(url: string): string {
  if (url.includes("arxiv.org"))            return "arXiv ↗";
  if (url.includes("huggingface.co"))       return "🤗 HF ↗";
  if (url.includes("github.com"))           return "GitHub ↗";
  if (url.includes("ycombinator.com"))      return "HN ↗";
  if (url.includes("reddit.com"))           return "Reddit ↗";
  if (url.includes("semanticscholar.org"))  return "Scholar ↗";
  if (url.includes("doi.org"))              return "Paper ↗";
  if (url.includes("dev.to"))               return "Dev.to ↗";
  return "View ↗";
}

function TrendCard({ trend, selected, onToggle }: { trend: TrendItem; selected: boolean; onToggle: () => void }) {
  const m = SOURCE_META[trend.source];
  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onToggle()}
      className={`
        w-full text-left rounded-xl border p-4 transition-all duration-200 relative cursor-pointer
        ${selected
          ? "border-brand-500/60 bg-brand-500/5 ring-1 ring-brand-500/30"
          : "border-surface-border bg-surface-card hover:bg-surface-hover"
        }
      `}
    >
      <div className={`
        absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
        ${selected ? "border-brand-500 bg-brand-500" : "border-slate-600"}
      `}>
        {selected && <span className="text-white text-[10px] font-bold">✓</span>}
      </div>
      <div className="pr-7">
        <div className="mb-2"><SourceBadge source={trend.source} /></div>
        <p className="text-sm font-semibold text-slate-100 leading-snug mb-1.5 line-clamp-2">{trend.title}</p>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-2">{trend.description}</p>
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className={`text-xs font-medium ${m.color}`}>{trend.signal}</span>
          <a
            href={trend.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-md border ${m.border} ${m.bg} ${m.color} hover:opacity-80 transition-opacity`}
          >
            {sourceLinkLabel(trend.url)}
          </a>
        </div>
        {trend.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {trend.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-surface-hover rounded text-slate-500">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IdeaCard({ idea, index, onLaunch, launching }: { idea: SparkIdea; index: number; onLaunch: () => void; launching: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const c = IDEA_COLORS[index % IDEA_COLORS.length];
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
              <span className={`text-sm font-bold ${c.accent}`}>{index + 1}</span>
            </div>
            <div>
              <h3 className={`text-lg font-bold ${c.accent}`}>{idea.name}</h3>
              <p className="text-sm text-slate-300 mt-0.5">{idea.tagline}</p>
            </div>
          </div>
          <button
            onClick={onLaunch}
            disabled={launching}
            className={`shrink-0 flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${launching ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-brand-500 hover:bg-brand-600 text-white"}`}
          >
            {launching ? (
              <><span className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />Starting…</>
            ) : "Launch Studio →"}
          </button>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">The Problem</p>
          <p className="text-sm text-slate-300 leading-relaxed">{idea.problem}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">The Solution</p>
          <p className="text-sm text-slate-300 leading-relaxed">{idea.solution}</p>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
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
                    <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${c.bg} border ${c.border} ${c.accent}`}>
                      {t.slice(0, 55)}{t.length > 55 ? "…" : ""}
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

function HistoryCard({ idea, onLaunch, launching }: { idea: IdeaRecord; onLaunch: () => void; launching: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = idea.created_at.slice(0, 10);
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card hover:border-slate-600 transition-all">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-100 truncate">{idea.idea_name}</p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{idea.tagline}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {idea.github_url && (
              <a
                href={idea.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-emerald-400 transition-colors border border-surface-border rounded-lg px-2.5 py-1.5"
                title="View on GitHub"
              >
                GitHub ↗
              </a>
            )}
            <button
              onClick={onLaunch}
              disabled={launching}
              className="text-xs font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 transition-all"
            >
              {launching ? "…" : "Run Studio →"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>{dateStr}</span>
          {idea.trend_signals.length > 0 && (
            <span>· {idea.trend_signals.length} signal{idea.trend_signals.length !== 1 ? "s" : ""}</span>
          )}
          {idea.github_url && <span className="text-emerald-600">· saved to GitHub</span>}
        </div>
        <button onClick={() => setExpanded(v => !v)} className="mt-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">
          {expanded ? "▾ Hide" : "▸ Problem · Solution"}
        </button>
        {expanded && (
          <div className="mt-3 space-y-2 pt-3 border-t border-surface-border">
            <p className="text-xs text-slate-400 leading-relaxed"><span className="font-semibold text-slate-500">Problem: </span>{idea.problem}</p>
            <p className="text-xs text-slate-400 leading-relaxed"><span className="font-semibold text-slate-500">Solution: </span>{idea.solution}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton loaders ────────────────────────────────────────────────────────

function TrendSkeleton() {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 animate-pulse">
      <div className="h-3 bg-slate-700 rounded w-16 mb-3" />
      <div className="h-4 bg-slate-700 rounded w-full mb-2" />
      <div className="h-3 bg-slate-700 rounded w-4/5 mb-2" />
      <div className="h-3 bg-slate-700 rounded w-2/5" />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type ActiveTab = "explore" | "history";

export default function IdeasClient() {
  const router = useRouter();
  const { toast, show: showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>("explore");

  // Explore tab state
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [trendError, setTrendError] = useState("");
  const [activeSource, setActiveSource] = useState<"all" | "github" | "hn" | "arxiv" | "reddit" | "scholar" | "saas" | "devto">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sparking, setSparking] = useState(false);
  const [ideas, setIdeas] = useState<SparkIdea[]>([]);
  const [launchingIdx, setLaunchingIdx] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [resolvingUrl, setResolvingUrl] = useState(false);
  const [direction, setDirection] = useState("");

  // History tab state
  const [history, setHistory] = useState<IdeaRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [launchingHistoryId, setLaunchingHistoryId] = useState<string | null>(null);

  // Load trends on mount
  useEffect(() => {
    loadTrends();
  }, []);

  // Load history when tab switches
  useEffect(() => {
    if (activeTab === "history" && history.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  const loadTrends = () => {
    setLoadingTrends(true);
    setTrendError("");
    getTrends()
      .then(setTrends)
      .catch(() => setTrendError("Failed to load trend signals. Check your connection."))
      .finally(() => setLoadingTrends(false));
  };

  const loadHistory = () => {
    setLoadingHistory(true);
    setHistoryError("");
    getIdeasHistory()
      .then(setHistory)
      .catch(() => setHistoryError("Failed to load history."))
      .finally(() => setLoadingHistory(false));
  };

  const filteredTrends = activeSource === "all" ? trends : trends.filter(t => t.source === activeSource);
  const sourceCounts = {
    all:     trends.length,
    github:  trends.filter(t => t.source === "github").length,
    hn:      trends.filter(t => t.source === "hn").length,
    arxiv:   trends.filter(t => t.source === "arxiv").length,
    reddit:  trends.filter(t => t.source === "reddit").length,
    scholar: trends.filter(t => t.source === "scholar").length,
    saas:    trends.filter(t => t.source === "saas").length,
    devto:   trends.filter(t => t.source === "devto").length,
  };

  const toggleTrend = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;
    setResolvingUrl(true);
    try {
      const item = await resolveTrendUrl(url);
      // Avoid duplicates
      if (trends.find(t => t.id === item.id)) {
        showToast("Already in the list", "error");
      } else {
        setTrends(prev => [item, ...prev]);
        setSelectedIds(prev => new Set([...prev, item.id]));
        setActiveSource("all");
        showToast(`Added: ${item.title.slice(0, 60)}`, "success");
      }
      setUrlInput("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not resolve URL", "error");
    } finally {
      setResolvingUrl(false);
    }
  };

  const handleSparkIdeas = async () => {
    const selected = trends.filter(t => selectedIds.has(t.id));
    if (!selected.length) { showToast("Select at least one trend signal first", "error"); return; }
    setSparking(true);
    setIdeas([]);
    try {
      const generated = await sparkIdeas(selected, direction);
      setIdeas(generated);
      // Refresh history count silently
      getIdeasHistory().then(setHistory).catch(() => {});
      setTimeout(() => document.getElementById("ideas-section")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate ideas", "error");
    } finally {
      setSparking(false);
    }
  };

  const handleLaunchFromIdea = async (name: string, tagline: string, problem: string, solution: string, setter: (v: boolean) => void) => {
    setter(true);
    try {
      const pitch = `${name}: ${tagline}\n\nProblem: ${problem}\n\nSolution: ${solution}`;
      const session = await createSession(pitch);
      router.push(`/studio/${session.session_id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to start studio", "error");
      setter(false);
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
          <div className="flex items-center gap-3">
            <a href="/history" className="text-sm text-slate-400 hover:text-slate-200 transition-colors hidden sm:block">
              📋 Reports
            </a>
            <div className="flex items-center gap-1 bg-surface-card border border-surface-border rounded-xl p-1">
              {(["explore", "history"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all capitalize ${
                    activeTab === tab ? "bg-brand-500 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab === "explore" ? "🔭 Explore" : `📚 History${history.length > 0 ? ` (${history.length})` : ""}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-surface-border bg-gradient-to-br from-surface-card via-surface to-surface px-6 py-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 rounded-full px-4 py-1.5 mb-5">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-slow" />
            <span className="text-xs font-medium text-brand-500">
              GitHub · HN · arXiv · HuggingFace · Reddit · Semantic Scholar
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 mb-4">
            {activeTab === "explore" ? "🔭 Startup Idea Radar" : "📚 Idea History"}
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {activeTab === "explore"
              ? "Scan live signals across tech, research papers, and trends. Let Claude Opus synthesise them into your next $1B startup."
              : "Every idea you've generated — saved to your database and pushed to GitHub in rich markdown."}
          </p>
          {activeTab === "explore" && !loadingTrends && trends.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm text-slate-500">
              <span><span className="text-emerald-400 font-semibold">{sourceCounts.github}</span> GitHub repos</span>
              <span><span className="text-orange-400 font-semibold">{sourceCounts.hn}</span> HN stories</span>
              <span><span className="text-violet-400 font-semibold">{sourceCounts.arxiv}</span> research papers</span>
              <span><span className="text-rose-400 font-semibold">{sourceCounts.reddit}</span> Reddit posts</span>
              <span><span className="text-cyan-400 font-semibold">{sourceCounts.scholar}</span> cited papers</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── EXPLORE TAB ────────────────────────────────────────────────── */}
        {activeTab === "explore" && (
          <>
            {/* Add by URL */}
            <form onSubmit={handleAddUrl} className="flex items-center gap-2 mb-5">
              <div className="relative flex-1 max-w-xl">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">🔗</span>
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="Paste any arXiv, GitHub, or Hacker News URL to add it as a signal…"
                  className="w-full bg-surface-card border border-surface-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!urlInput.trim() || resolvingUrl}
                className="shrink-0 flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-surface-card border-surface-border text-slate-300 hover:border-brand-500/60 hover:text-brand-400"
              >
                {resolvingUrl
                  ? <><span className="w-3.5 h-3.5 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin" />Fetching…</>
                  : "Add →"}
              </button>
            </form>

            {/* Source filter + selection controls */}
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div className="flex flex-wrap items-center gap-1 bg-surface-card border border-surface-border rounded-xl p-1">
                {(["all", "github", "hn", "arxiv", "reddit", "scholar", "saas", "devto"] as const).map(src => (
                  <button
                    key={src}
                    onClick={() => setActiveSource(src)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      activeSource === src ? "bg-brand-500 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {src === "all"     && "All"}
                    {src === "github"  && <><span className="text-emerald-400">⚡</span> GitHub</>}
                    {src === "hn"      && <><span className="text-orange-400">▲</span> HN</>}
                    {src === "arxiv"   && <><span className="text-violet-400">📄</span> arXiv + HF</>}
                    {src === "reddit"  && <><span className="text-rose-400">🔴</span> Reddit AI</>}
                    {src === "scholar" && <><span className="text-cyan-400">📚</span> Scholar</>}
                    {src === "saas"    && <><span className="text-lime-400">💸</span> SaaS</>}
                    {src === "devto"   && <><span className="text-sky-400">🖊</span> Dev.to</>}
                    <span className={`text-xs ${activeSource === src ? "text-white/70" : "text-slate-600"}`}>
                      {sourceCounts[src]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={loadTrends} disabled={loadingTrends} className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40">
                  ↻ Refresh
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-slate-500">
                    <span className="text-brand-500 font-semibold">{selectedIds.size}</span> selected
                  </span>
                )}
                <button onClick={() => setSelectedIds(new Set(filteredTrends.map(t => t.id)))} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Select all
                </button>
                {selectedIds.size > 0 && (
                  <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Trend grid */}
            {loadingTrends ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => <TrendSkeleton key={i} />)}
              </div>
            ) : trendError ? (
              <div className="text-center py-16">
                <p className="text-red-400 mb-3">{trendError}</p>
                <button onClick={loadTrends} className="text-sm text-slate-400 hover:text-slate-200 underline">Try again</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredTrends.map(trend => (
                  <TrendCard key={trend.id} trend={trend} selected={selectedIds.has(trend.id)} onToggle={() => toggleTrend(trend.id)} />
                ))}
              </div>
            )}

            {/* Spark CTA */}
            {!loadingTrends && trends.length > 0 && (
              <div className="mt-8 flex flex-col items-center gap-4">
                {/* Direction input */}
                <div className="w-full max-w-2xl">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Your Direction <span className="normal-case font-normal text-slate-600">(optional — tell Claude what kind of startup to focus on)</span>
                  </label>
                  <textarea
                    value={direction}
                    onChange={e => setDirection(e.target.value)}
                    disabled={sparking}
                    rows={2}
                    placeholder='e.g. "Focus on B2B developer tools" · "I want to build in healthcare" · "Ideas that can be built solo in 3 months"'
                    className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all resize-none disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleSparkIdeas}
                  disabled={sparking || selectedIds.size === 0}
                  className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all ${
                    selectedIds.size === 0
                      ? "bg-surface-card border border-surface-border text-slate-500 cursor-not-allowed"
                      : sparking
                      ? "bg-brand-600 text-white cursor-wait"
                      : "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                  }`}
                >
                  {sparking ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analysing {selectedIds.size} signal{selectedIds.size !== 1 ? "s" : ""} with Claude Opus…
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
                    {direction.trim()
                      ? `Focusing on "${direction.slice(0, 60)}${direction.length > 60 ? "…" : ""}" → synthesising trends → generating ideas…`
                      : "Synthesising trends → identifying market gaps → generating ideas → saving to GitHub…"}
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
                    <h2 className="text-lg font-bold text-slate-100">{ideas.length} Startup Ideas</h2>
                    <span className="text-sm text-slate-500">saved to DB + GitHub</span>
                  </div>
                  <div className="h-px flex-1 bg-surface-border" />
                </div>
                <div className="space-y-5">
                  {ideas.map((idea, i) => (
                    <IdeaCard
                      key={i}
                      idea={idea}
                      index={i}
                      onLaunch={() => {
                        const wasLaunching = launchingIdx === i;
                        if (!wasLaunching) {
                          handleLaunchFromIdea(idea.name, idea.tagline, idea.problem, idea.solution, (v) => setLaunchingIdx(v ? i : null));
                        }
                      }}
                      launching={launchingIdx === i}
                    />
                  ))}
                </div>
                <div className="mt-8 p-5 rounded-2xl border border-surface-border bg-surface-card text-center">
                  <p className="text-sm text-slate-400 mb-3">Have your own idea that's not on the list?</p>
                  <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-500 hover:text-brand-400 transition-colors">
                    Run the full studio with any idea →
                  </a>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ────────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-slate-200">
                  {loadingHistory ? "Loading…" : `${history.length} idea${history.length !== 1 ? "s" : ""} generated`}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">All ideas saved to database · pushed to GitHub when token is set</p>
              </div>
              <button onClick={loadHistory} disabled={loadingHistory} className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40 border border-surface-border rounded-lg px-3 py-1.5">
                ↻ Refresh
              </button>
            </div>

            {loadingHistory ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-surface-border bg-surface-card p-5 animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-700 rounded w-full mb-1" />
                    <div className="h-3 bg-slate-700 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : historyError ? (
              <div className="text-center py-16">
                <p className="text-red-400 mb-3">{historyError}</p>
                <button onClick={loadHistory} className="text-sm text-slate-400 hover:text-slate-200 underline">Try again</button>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-5xl mb-4">🔭</div>
                <p className="text-slate-400 text-lg font-medium mb-2">No ideas generated yet</p>
                <p className="text-slate-600 text-sm mb-6">Go to the Explore tab, select trend signals, and hit Spark Ideas.</p>
                <button onClick={() => setActiveTab("explore")} className="text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl transition-all">
                  Start Exploring →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map(idea => (
                  <HistoryCard
                    key={idea.id}
                    idea={idea}
                    onLaunch={() => handleLaunchFromIdea(idea.idea_name, idea.tagline, idea.problem, idea.solution, (v) => setLaunchingHistoryId(v ? idea.id : null))}
                    launching={launchingHistoryId === idea.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
