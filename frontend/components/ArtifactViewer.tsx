"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ArtifactViewerProps {
  title: string;
  content: string;
  isActive?: boolean;
}

export default function ArtifactViewer({ title, content, isActive }: ArtifactViewerProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className={`rounded-2xl border bg-surface-card transition-all ${isActive ? "border-brand-500/60" : "border-surface-border"}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        <button
          onClick={handleCopy}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-hover border border-surface-border"
        >
          Copy
        </button>
      </div>
      <div className="px-6 py-5 prose max-w-none overflow-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
