"use client";

interface AgentCardProps {
  role: string;
  label: string;
  phase: number;
  icon: string;
  color: string;
  status: "idle" | "thinking" | "done";
}

export default function AgentCard({ role, label, phase, icon, color, status }: AgentCardProps) {
  return (
    <div
      className={`
        flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-300
        ${status === "thinking"
          ? `border-[${color}] bg-[${color}]/10 shadow-[0_0_16px_${color}33]`
          : status === "done"
          ? "border-surface-border bg-surface-card opacity-70"
          : "border-surface-border bg-surface-card opacity-40"}
      `}
      style={status === "thinking" ? { borderColor: color, background: `${color}15`, boxShadow: `0 0 16px ${color}33` } : {}}
    >
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">{label}</p>
        <p className="text-xs text-slate-500">Phase {phase}</p>
      </div>
      <div className="ml-auto shrink-0">
        {status === "thinking" && (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: color }} />
          </span>
        )}
        {status === "done" && (
          <span className="text-emerald-400 text-sm">✓</span>
        )}
        {status === "idle" && (
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-600" />
        )}
      </div>
    </div>
  );
}
