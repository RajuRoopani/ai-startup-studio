"use client";

const PHASES = [
  { num: 1, label: "Research" },
  { num: 2, label: "Stress Test" },
  { num: 3, label: "Build Plan" },
  { num: 4, label: "Synthesis" },
];

interface PhaseTrackerProps {
  currentPhase: number;
  isComplete: boolean;
}

export default function PhaseTracker({ currentPhase, isComplete }: PhaseTrackerProps) {
  return (
    <div className="flex items-center gap-0">
      {PHASES.map((phase, i) => {
        const isDone = isComplete || currentPhase > phase.num;
        const isActive = !isComplete && currentPhase === phase.num;

        return (
          <div key={phase.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  transition-all duration-500
                  ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-brand-500 text-white ring-4 ring-brand-500/30" : "bg-surface-border text-slate-500"}
                `}
              >
                {isDone ? "✓" : phase.num}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${isActive ? "text-brand-500" : isDone ? "text-emerald-400" : "text-slate-600"}`}>
                {phase.label}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div className={`w-16 h-0.5 mx-1 mb-5 transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-surface-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
