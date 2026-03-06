"use client";

import { useState } from "react";
import type { SessionDetail } from "@/lib/api";
import ArtifactViewer from "@/components/ArtifactViewer";

const ARTIFACT_ORDER = [
  "founder_synthesis",
  "market_analysis",
  "product_spec",
  "gtm_strategy",
  "financial_model",
  "tech_blueprint",
  "legal_assessment",
  "vc_review",
];

export default function OutputClient({ session }: { session: SessionDetail }) {
  const [activeKey, setActiveKey] = useState(ARTIFACT_ORDER[0]);

  const artifactMap = Object.fromEntries(session.artifacts.map((a) => [a.key, a]));
  const orderedArtifacts = ARTIFACT_ORDER.map((k) => artifactMap[k]).filter(Boolean);
  const active = artifactMap[activeKey];

  const handleShare = () => {
    const url = `${window.location.origin}/output/${session.id}`;
    navigator.clipboard.writeText(url);
  };

  const handleDownload = () => {
    const all = orderedArtifacts.map((a) => `# ${a.title}\n\n${a.content}`).join("\n\n---\n\n");
    const blob = new Blob([`# AI Startup Studio — ${session.idea}\n\n---\n\n${all}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "startup-package.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-surface-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <a href="/" className="text-slate-400 hover:text-slate-200 transition-colors shrink-0">
              <span className="font-bold text-slate-100">🚀 AI Startup Studio</span>
            </a>
            <span className="text-slate-600 hidden sm:block">·</span>
            <p className="text-slate-400 text-sm truncate hidden sm:block">{session.idea}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleShare}
              className="text-sm text-slate-400 hover:text-slate-200 border border-surface-border rounded-lg px-3 py-1.5 hover:bg-surface-hover transition-all"
            >
              Share ↗
            </button>
            <button
              onClick={handleDownload}
              className="text-sm text-white bg-brand-500 hover:bg-brand-600 rounded-lg px-3 py-1.5 transition-all font-medium"
            >
              Download .md
            </button>
          </div>
        </div>
      </header>

      {/* Idea banner */}
      <div className="border-b border-surface-border bg-surface-card/50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Your idea</p>
          <p className="text-slate-200 font-medium">{session.idea}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar nav */}
        <aside className="w-52 shrink-0">
          <nav className="space-y-1 sticky top-6">
            {orderedArtifacts.map((artifact) => (
              <button
                key={artifact.key}
                onClick={() => setActiveKey(artifact.key)}
                className={`
                  w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all
                  ${activeKey === artifact.key
                    ? "bg-brand-500/15 text-brand-500 font-medium border border-brand-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-surface-hover"}
                `}
              >
                {artifact.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {active && (
            <div className="animate-fade-in">
              <ArtifactViewer
                title={active.title}
                content={active.content}
                isActive
              />
            </div>
          )}
          {!active && (
            <div className="text-center py-20 text-slate-600">
              <p>Select an artifact from the sidebar.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
