"use client";

import { useEffect, useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import { useAnalysisReady } from "./AnalysisReadyProvider";
import { AiAnalysis } from "./AiAnalysis";

interface AiAnalysisClientProps {
  codeInsee: string;
}

function AnalysisSkeleton() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Analyse IA</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          Mistral
        </span>
      </div>
      <div className="mt-4 animate-pulse space-y-3">
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-5/6 rounded bg-slate-100" />
        <div className="h-4 w-4/6 rounded bg-slate-100" />
        <p className="text-sm text-slate-500">Génération de l&apos;analyse…</p>
      </div>
    </section>
  );
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "configured" in value &&
    typeof (value as AnalysisResult).configured === "boolean"
  );
}

export function AiAnalysisClient({ codeInsee }: AiAnalysisClientProps) {
  const { markReady } = useAnalysisReady();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalysis() {
      setLoading(true);
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codeInsee }),
        });
        const data: unknown = await response.json();

        if (!cancelled) {
          if (response.ok && isAnalysisResult(data)) {
            setResult(data);
          } else {
            const message =
              typeof data === "object" &&
              data !== null &&
              "error" in data &&
              typeof data.error === "string"
                ? data.error
                : "Erreur lors de l'analyse territoriale.";
            setResult({
              analysis: null,
              configured: true,
              error: message,
            });
          }
        }
      } catch {
        if (!cancelled) {
          setResult({
            analysis: null,
            configured: true,
            error: "Impossible de générer l'analyse pour le moment.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          markReady();
        }
      }
    }

    void fetchAnalysis();

    return () => {
      cancelled = true;
    };
  }, [codeInsee, markReady]);

  if (loading || !result) {
    return <AnalysisSkeleton />;
  }

  return <AiAnalysis result={result} />;
}
