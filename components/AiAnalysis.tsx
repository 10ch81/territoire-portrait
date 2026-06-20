import type { AnalysisResult, TerritoryAnalysis } from "@/lib/types";
import { AnalysisLimitsPanel } from "./AnalysisLimitsPanel";
import { ErrorBox } from "./ErrorBox";
import { EmptyState } from "./EmptyState";

interface AiAnalysisProps {
  result: AnalysisResult;
}

type DisplayAnalysis = Pick<
  TerritoryAnalysis,
  "summary" | "strengths" | "watchPoints" | "opportunities"
>;

function resolveDisplayAnalysis(analysis: TerritoryAnalysis): DisplayAnalysis & {
  hideStrengthsList: boolean;
} {
  const editorial = analysis.editorial;
  if (editorial?.summary.trim()) {
    return {
      summary: editorial.summary,
      strengths: editorial.strengths,
      watchPoints:
        editorial.watchPoints.length > 0
          ? editorial.watchPoints
          : analysis.watchPoints,
      opportunities: editorial.opportunities,
      hideStrengthsList: true,
    };
  }

  return {
    summary: analysis.summary,
    strengths: analysis.strengths,
    watchPoints: analysis.watchPoints,
    opportunities: analysis.opportunities,
    hideStrengthsList: false,
  };
}

function hasDisplayContent(analysis: TerritoryAnalysis): boolean {
  const display = resolveDisplayAnalysis(analysis);
  return (
    display.summary.trim().length > 0 ||
    display.strengths.length > 0 ||
    display.watchPoints.length > 0 ||
    display.opportunities.length > 0
  );
}

function AnalysisList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}

export function AiAnalysis({ result }: AiAnalysisProps) {
  const display =
    result.analysis !== null ? resolveDisplayAnalysis(result.analysis) : null;

  const hasAnalysisContent =
    result.analysis !== null && hasDisplayContent(result.analysis);

  const showDegradedNotice =
    hasAnalysisContent && (result.degraded === true || Boolean(result.error));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Synthèse territoriale</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {result.llmUsed === false || result.degraded ? "Serveur" : "Mistral"}
        </span>
      </div>

      {showDegradedNotice ? (
        <div className="mt-4">
          {result.error ? (
            <ErrorBox message={result.error} />
          ) : !result.configured ? (
            <EmptyState
              title="Synthèse territoriale non configurée"
              description="La synthèse ci-dessous est générée côté serveur sans appel Mistral."
            />
          ) : null}
          {result.degraded && result.configured ? (
            <p className="mt-3 text-sm text-slate-600">
              Synthèse déterministe affichée : l&apos;appel Mistral n&apos;a pas abouti.
            </p>
          ) : null}
        </div>
      ) : null}

      {hasAnalysisContent && display ? (
        <div className="mt-4 space-y-5">
          <p className="text-sm leading-relaxed text-slate-700">
            {display.summary}
          </p>

          {display.hideStrengthsList ? null : (
            <AnalysisList
              title="Points forts"
              items={display.strengths}
              emptyLabel="Aucun point identifié."
            />
          )}
          <AnalysisList
            title="Points d'attention"
            items={display.watchPoints}
            emptyLabel="Aucun point d'attention identifié."
          />
          <AnalysisList
            title="Opportunités possibles"
            items={display.opportunities}
            emptyLabel="Aucune opportunité identifiée."
          />
        </div>
      ) : !result.configured ? (
        <div className="mt-4">
          <EmptyState
            title="Synthèse territoriale non configurée"
            description={
              result.error ??
              "Ajoutez MISTRAL_API_KEY dans .env.local pour activer la synthèse territoriale."
            }
          />
        </div>
      ) : result.error ? (
        <div className="mt-4">
          <ErrorBox message={result.error} />
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="Synthèse indisponible"
            description="La synthèse territoriale n'a pas pu être générée."
          />
        </div>
      )}

      <AnalysisLimitsPanel dataLimits={result.analysis?.dataLimits ?? []} />
    </section>
  );
}
