"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { streamSession } from "@/lib/api";
import AgentCard from "@/components/AgentCard";
import PhaseTracker from "@/components/PhaseTracker";

const AGENT_META: Record<string, { label: string; icon: string; color: string; phase: number }> = {
  market_analyst:    { label: "Market Analyst",    icon: "📊", color: "#0ea5e9", phase: 1 },
  tech_architect:    { label: "Tech Architect",    icon: "🏗️", color: "#8b5cf6", phase: 1 },
  vc_partner:        { label: "VC Partner",        icon: "💰", color: "#f59e0b", phase: 2 },
  legal_advisor:     { label: "Legal Advisor",     icon: "⚖️", color: "#ef4444", phase: 2 },
  product_manager:   { label: "Product Manager",   icon: "🎯", color: "#10b981", phase: 3 },
  growth_strategist: { label: "Growth Strategist", icon: "🚀", color: "#06b6d4", phase: 3 },
  cfo:               { label: "CFO",               icon: "📈", color: "#84cc16", phase: 3 },
  founder:           { label: "Founder",           icon: "💡", color: "#f97316", phase: 4 },
  product_architect: { label: "Product Architect", icon: "🎨", color: "#a78bfa", phase: 5 },
};

interface FeedMessage {
  id: string;
  agent: string;
  content: string;
  isStreaming: boolean;
}

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [currentPhase, setCurrentPhase] = useState(0);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [doneAgents, setDoneAgents] = useState<Set<string>>(new Set());
  const [feedMessages, setFeedMessages] = useState<FeedMessage[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState("Initialising...");

  const feedRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = streamSession(sessionId);
    esRef.current = es;

    es.onmessage = (e) => {
      const event = JSON.parse(e.data);

      if (event.type === "phase_start") {
        setCurrentPhase(event.phase);
        setPhaseLabel(event.content);
      }

      if (event.type === "agent_start") {
        setActiveAgent(event.agent);
        setFeedMessages((prev) => [
          ...prev,
          { id: `${event.agent}-${Date.now()}`, agent: event.agent, content: "", isStreaming: true },
        ]);
      }

      if (event.type === "agent_chunk") {
        setFeedMessages((prev) => {
          const idx = [...prev].reverse().findIndex((m) => m.agent === event.agent && m.isStreaming);
          if (idx === -1) return prev;
          const realIdx = prev.length - 1 - idx;
          const updated = [...prev];
          updated[realIdx] = { ...updated[realIdx], content: updated[realIdx].content + event.content };
          return updated;
        });
      }

      if (event.type === "agent_complete") {
        setActiveAgent(null);
        setDoneAgents((prev) => new Set([...prev, event.agent]));
        setFeedMessages((prev) =>
          prev.map((m) => (m.agent === event.agent && m.isStreaming ? { ...m, isStreaming: false } : m))
        );
      }

      if (event.type === "session_complete") {
        setIsComplete(true);
        es.close();
        setTimeout(() => router.push(`/output/${sessionId}`), 1500);
      }

      if (event.type === "error") {
        setHasError(true);
        es.close();
      }
    };

    es.onerror = () => setHasError(true);

    return () => es.close();
  }, [sessionId, router]);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feedMessages]);

  const getAgentStatus = (role: string) => {
    if (doneAgents.has(role)) return "done" as const;
    if (activeAgent === role) return "thinking" as const;
    return "idle" as const;
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-border px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
            <span>←</span>
            <span className="font-bold text-slate-100">🚀 AI Startup Studio</span>
          </a>
          <div className="flex items-center gap-3">
            {!isComplete && !hasError && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span>{phaseLabel}</span>
              </div>
            )}
            {isComplete && (
              <span className="text-sm text-emerald-400 font-medium">✓ Complete — redirecting...</span>
            )}
            {hasError && (
              <span className="text-sm text-red-400">Session failed</span>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 max-w-7xl mx-auto w-full px-6 py-6 gap-6">
        {/* Sidebar — agent roster */}
        <aside className="w-56 shrink-0 flex flex-col gap-3">
          <div className="mb-2">
            <PhaseTracker currentPhase={currentPhase} isComplete={isComplete} />
          </div>
          {Object.entries(AGENT_META).map(([role, meta]) => (
            <AgentCard
              key={role}
              role={role}
              label={meta.label}
              phase={meta.phase}
              icon={meta.icon}
              color={meta.color}
              status={getAgentStatus(role)}
            />
          ))}
        </aside>

        {/* Main — live feed */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto space-y-6 pr-2"
            style={{ maxHeight: "calc(100vh - 140px)" }}
          >
            {feedMessages.length === 0 && (
              <div className="flex items-center justify-center h-64 text-slate-600">
                <div className="text-center">
                  <div className="text-4xl mb-3">⏳</div>
                  <p>Starting studio session...</p>
                </div>
              </div>
            )}

            {feedMessages.map((msg) => {
              const meta = AGENT_META[msg.agent];
              if (!meta) return null;
              return (
                <div key={msg.id} className="animate-slide-up">
                  {/* Agent header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{meta.icon}</span>
                    <span className="font-semibold text-sm" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-600">Phase {meta.phase}</span>
                    {msg.isStreaming && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 ml-auto">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: meta.color }} />
                        thinking...
                      </span>
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className="rounded-2xl border p-5 bg-surface-card"
                    style={{ borderColor: msg.isStreaming ? `${meta.color}40` : "transparent" }}
                  >
                    <div className={`prose max-w-none text-sm leading-relaxed whitespace-pre-wrap ${msg.isStreaming ? "cursor-blink" : ""}`}>
                      {msg.content || <span className="text-slate-600 italic">...</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {isComplete && (
              <div className="text-center py-8 animate-fade-in">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-emerald-400 font-semibold">Studio session complete!</p>
                <p className="text-slate-500 text-sm mt-1">Redirecting to your startup package...</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
