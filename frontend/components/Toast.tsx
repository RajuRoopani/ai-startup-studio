"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  show: boolean;
  type?: "success" | "error";
}

export default function Toast({ message, show, type = "success" }: ToastProps) {
  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
        shadow-2xl border transition-all duration-300
        ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
        ${type === "success"
          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
          : "bg-red-500/20 border-red-500/40 text-red-300"}
      `}
    >
      <span>{type === "success" ? "✓" : "✗"}</span>
      {message}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const show = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  return { toast, show };
}
