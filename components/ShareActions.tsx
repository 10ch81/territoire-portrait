"use client";

import { useCallback, useState } from "react";
import { useAnalysisReady } from "./AnalysisReadyProvider";

interface ShareActionsProps {
  communeName: string;
}

export function ShareActions({ communeName }: ShareActionsProps) {
  const { ready: analysisReady } = useAnalysisReady();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  const handlePrint = useCallback(() => {
    if (!analysisReady) {
      return;
    }
    window.print();
  }, [analysisReady]);

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
      >
        {copied ? "Lien copié" : "Copier le lien"}
      </button>
      <button
        type="button"
        onClick={handlePrint}
        disabled={!analysisReady}
        title={
          analysisReady
            ? undefined
            : "Attendez la fin du chargement de l'analyse IA"
        }
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Imprimer la fiche de ${communeName}`}
        aria-busy={!analysisReady}
      >
        Imprimer / PDF
      </button>
    </div>
  );
}
