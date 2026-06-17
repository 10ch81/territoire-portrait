import type { AnalysisResult } from "@/lib/types";
import { ErrorBox } from "./ErrorBox";
import { EmptyState } from "./EmptyState";

interface AiAnalysisProps {
  result: AnalysisResult;
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
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Analyse IA</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          Mistral
        </span>
      </div>

      {!result.configured ? (
        <div className="mt-4">
          <EmptyState
            title="Analyse IA non configurée"
            description={
              result.error ??
              "Ajoutez MISTRAL_API_KEY dans .env.local pour activer l'analyse."
            }
          />
        </div>
      ) : result.error ? (
        <div className="mt-4">
          <ErrorBox message={result.error} />
        </div>
      ) : result.analysis ? (
        <div className="mt-4 space-y-5">
          <p className="text-sm leading-relaxed text-slate-700">
            {result.analysis.summary}
          </p>

          <AnalysisList
            title="Points forts"
            items={result.analysis.strengths}
            emptyLabel="Aucun point identifié."
          />
          <AnalysisList
            title="Points d'attention"
            items={result.analysis.watchPoints}
            emptyLabel="Aucun point d'attention identifié."
          />
          <AnalysisList
            title="Opportunités possibles"
            items={result.analysis.opportunities}
            emptyLabel="Aucune opportunité identifiée."
          />
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="Analyse indisponible"
            description="L'analyse n'a pas pu être générée."
          />
        </div>
      )}

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-amber-900">
          Limites de l&apos;analyse
        </h3>
        <p className="mt-1 text-sm text-amber-800">
          Cette synthèse ne remplace pas un diagnostic territorial officiel.
          Les limites ci-dessous sont calculées à partir des sources réellement
          chargées pour cette commune.
        </p>
        {result.analysis?.dataLimits.length ? (
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
            {result.analysis.dataLimits.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-amber-800">
            Aucune limite spécifique identifiée pour cette commune.
          </p>
        )}
      </div>
    </section>
  );
}
