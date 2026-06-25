"use client";

import { useCallback, useState } from "react";
import type { CompareHighlight } from "@/lib/compare/types";

interface CompareHighlightsProps {
  highlights: CompareHighlight[];
}

export function CompareHighlights({ highlights }: CompareHighlightsProps) {
  if (highlights.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-base font-semibold text-amber-950">Points saillants</h2>
      <p className="mt-1 text-sm text-amber-900/80">
        Comparaisons thématiques — sans score global ni classement général.
      </p>
      <ul className="mt-4 space-y-2">
        {highlights.map((item) => (
          <li
            key={`${item.profileLabel}-${item.indicatorId}`}
            className="rounded-lg border border-amber-200/80 bg-white px-4 py-3 text-sm text-slate-800"
          >
            <span className="font-medium text-amber-950">{item.profileLabel} — </span>
            {item.sentence}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface CompareWarningsProps {
  warnings: string[];
}

export function CompareWarnings({ warnings }: CompareWarningsProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-sm font-semibold text-slate-900">Limites de lecture</h2>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </section>
  );
}

interface ShareCompareActionsProps {
  communeNames: string[];
}

export function ShareCompareActions({ communeNames }: ShareCompareActionsProps) {
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
    window.print();
  }, []);

  const label = communeNames.join(", ");

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
      >
        {copied ? "Lien copié" : "Copier le lien"}
      </button>
      <button
        type="button"
        onClick={handlePrint}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
        aria-label={`Imprimer la comparaison ${label}`}
      >
        Imprimer / PDF
      </button>
    </div>
  );
}
