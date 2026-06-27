"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  parseComparePrioritiesParam,
  serializeComparePrioritiesParam,
} from "@/lib/compare/parse-codes";
import type { CompareHighlight } from "@/lib/compare/types";
import { benchmarkLabel, parseBenchmarkParam } from "@/lib/ux/benchmark";
import { useComparePriorities } from "@/lib/ux/compare-user-profile";
import { useHideSensitiveIndicators } from "@/lib/ux/sensitive-indicators";

interface CompareHighlightsProps {
  highlights: CompareHighlight[];
}

export function CompareHighlights({ highlights }: CompareHighlightsProps) {
  const searchParams = useSearchParams();
  const benchmark = parseBenchmarkParam(searchParams.get("benchmark") ?? undefined);

  if (highlights.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-amber-300 bg-amber-50 p-6 print:border-slate-400 print:bg-white"
      aria-labelledby="compare-highlights-heading"
    >
      <h2 id="compare-highlights-heading" className="text-base font-semibold text-amber-950 print:text-black">
        Points saillants
      </h2>
      <p className="mt-1 text-sm text-amber-950/90 print:text-black">
        Écarts vs {benchmarkLabel(benchmark)} — sans score global ni classement général.
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
    <section
      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 print:border-slate-400 print:bg-white"
      aria-labelledby="compare-warnings-heading"
    >
      <h2 id="compare-warnings-heading" className="text-sm font-semibold text-slate-900">
        Limites de lecture
      </h2>
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
  selectedCodes: string[];
}

export function ShareCompareActions({ communeNames, selectedCodes }: ShareCompareActionsProps) {
  const searchParams = useSearchParams();
  const urlPriorities = parseComparePrioritiesParam(searchParams.get("priorites") ?? undefined);
  const { priorityIds } = useComparePriorities({ urlPriorities });
  const { hideSensitive } = useHideSensitiveIndicators();
  const [copied, setCopied] = useState(false);

  const jsonLdHref = useMemo(() => {
    const params = new URLSearchParams({
      codes: selectedCodes.join(","),
    });
    const urlPriorites = searchParams.get("priorites");
    if (urlPriorites) {
      params.set("priorites", urlPriorites);
    } else {
      const serialized = serializeComparePrioritiesParam(priorityIds);
      if (serialized) {
        params.set("priorites", serialized);
      }
    }
    if (!hideSensitive) {
      params.set("includeSensitive", "1");
    }
    return `/api/compare/jsonld?${params.toString()}`;
  }, [hideSensitive, priorityIds, searchParams, selectedCodes]);

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
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        aria-live="polite"
      >
        {copied ? "Lien copié" : "Copier le lien"}
      </button>
      <a
        href={jsonLdHref}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        download={`comparaison-${selectedCodes.join("-")}.jsonld.json`}
      >
        Export JSON-LD
      </a>
      <button
        type="button"
        onClick={handlePrint}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        aria-label={`Imprimer la comparaison ${label}`}
      >
        Imprimer / PDF
      </button>
    </div>
  );
}
