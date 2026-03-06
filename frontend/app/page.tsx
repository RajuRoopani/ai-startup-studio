"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/api";

const EXAMPLES = [
  "Airbnb for parking spaces — rent your driveway when you're at work",
  "AI therapist that remembers every session and gives personalized CBT exercises",
  "B2B SaaS that turns Slack conversations into auto-generated meeting notes and tasks",
  "Marketplace connecting retired executives with early-stage startups as fractional advisors",
  "App that turns any YouTube tutorial into a personalized step-by-step interactive guide",
];

const AGENTS = [
  { icon: "📊", label: "Market Analyst", desc: "TAM/SAM/SOM + competition" },
  { icon: "🏗️", label: "Tech Architect",  desc: "Stack, feasibility, cost" },
  { icon: "💰", label: "VC Partner",       desc: "Stress-tests every assumption" },
  { icon: "⚖️", label: "Legal Advisor",    desc: "IP, regulatory, compliance" },
  { icon: "🎯", label: "Product Manager",  desc: "MVP spec + user journey" },
  { icon: "🚀", label: "Growth Strategist",desc: "GTM + first 100 users" },
  { icon: "📈", label: "CFO",              desc: "Unit economics + projections" },
  { icon: "💡", label: "Founder",          desc: "Synthesises into pitch narrative" },
];

export default function HomePage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    setLoading(true);
    setError("");
    try {
      const session = await createSession(idea.trim());
      router.push(`/studio/${session.session_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="border-b border-surface-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <span className="font-bold text-slate-100">AI Startup Studio</span>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Open Source ↗
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-slow" />
          <span className="text-xs font-medium text-brand-500">8 AI specialists • Live deliberation</span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-slate-100 leading-tight mb-6">
          Your startup idea.<br />
          <span className="text-brand-500">Torn apart.</span> Then built.
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12">
          8 AI specialists — market analyst, VC partner, CFO, legal advisor and more —
          debate your idea in real time and produce a complete investor-ready package in minutes.
        </p>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your startup idea in one sentence or a paragraph..."
              rows={3}
              maxLength={2000}
              className="w-full bg-surface-card border border-surface-border rounded-2xl px-5 py-4 text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent);
              }}
            />
            <div className="absolute bottom-3 right-3 text-xs text-slate-600">
              {idea.length}/2000
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm mt-2 text-left">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !idea.trim()}
            className="mt-4 w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-all text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting studio session...
              </>
            ) : (
              <>
                <span>Run the Studio</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* Example ideas */}
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-slate-600 mb-3">Try an example</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setIdea(ex)}
                className="text-xs text-slate-400 hover:text-slate-200 bg-surface-card hover:bg-surface-hover border border-surface-border rounded-full px-3 py-1.5 transition-all text-left"
              >
                {ex.slice(0, 50)}...
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Agent roster */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-center text-sm font-medium text-slate-500 uppercase tracking-widest mb-8">
          Meet the team
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AGENTS.map((agent) => (
            <div
              key={agent.label}
              className="bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-brand-500/40 transition-all"
            >
              <div className="text-3xl mb-2">{agent.icon}</div>
              <p className="text-sm font-semibold text-slate-200">{agent.label}</p>
              <p className="text-xs text-slate-500 mt-1">{agent.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="border-t border-surface-border py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-sm font-medium text-slate-500 uppercase tracking-widest mb-8">
            What you get
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "📋", title: "Executive Summary", desc: "3-paragraph pitch narrative" },
              { icon: "📊", title: "Market Analysis", desc: "TAM/SAM/SOM + competitors" },
              { icon: "🎯", title: "MVP Specification", desc: "Feature list + build timeline" },
              { icon: "🚀", title: "GTM Strategy", desc: "First 100 users playbook" },
              { icon: "📈", title: "Financial Model", desc: "3-year projections + unit economics" },
              { icon: "🏗️", title: "Tech Blueprint", desc: "Stack + infra cost estimate" },
              { icon: "⚖️", title: "Legal Assessment", desc: "Risks + 90-day checklist" },
              { icon: "💰", title: "VC Review", desc: "The questions investors will ask" },
            ].map((item) => (
              <div key={item.title} className="bg-surface-card border border-surface-border rounded-xl p-4">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-sm font-semibold text-slate-200 mt-2">{item.title}</p>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-surface-border py-8 text-center text-xs text-slate-600">
        AI Startup Studio — Open Source · Built with Claude
      </footer>
    </main>
  );
}
