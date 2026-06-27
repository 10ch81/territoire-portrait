"use client";

import { useCallback } from "react";

interface CommuneExportActionsProps {
  communeName: string;
}

export function CommuneExportActions({ communeName }: CommuneExportActionsProps) {
  const handleConseilPrint = useCallback(() => {
    document.body.classList.add("print-mode-conseil");
    const cleanup = () => {
      document.body.classList.remove("print-mode-conseil");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }, []);

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={handleConseilPrint}
        className="rounded-lg border border-slate-800 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-900"
        aria-label={`Exporter la fiche conseil de ${communeName}`}
      >
        Fiche conseil (PDF)
      </button>
    </div>
  );
}
