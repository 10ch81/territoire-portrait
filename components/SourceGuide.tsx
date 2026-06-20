import {
  ANALYSIS_LIMITS_SECTION_ID,
  getSourceGuide,
  RELIABILITY_LABELS,
  type SourceGuideId,
} from "@/lib/ux/source-guides";

interface SourceGuideProps {
  guideId: SourceGuideId;
  vintage?: string | number | null;
  contextAlerts?: string[];
  showLimitsLink?: boolean;
}

export function SourceGuide({
  guideId,
  vintage,
  contextAlerts = [],
  showLimitsLink = true,
}: SourceGuideProps) {
  const guide = getSourceGuide(guideId);
  const reliabilityLabel = RELIABILITY_LABELS[guide.reliability];

  return (
    <div className="space-y-2">
      <details className="rounded-md border border-amber-200 bg-amber-50/60">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-amber-950 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>Comment lire ces données</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              {reliabilityLabel}
            </span>
          </span>
        </summary>
        <div className="space-y-4 border-t border-amber-200 px-3 py-3 text-sm text-amber-950">
          <div>
            <h3 className="font-semibold text-amber-950">{guide.title}</h3>
            {vintage != null && vintage !== "" ? (
              <p className="mt-1 text-xs text-amber-800">Millésime affiché : {vintage}</p>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Ce que mesure l&apos;indicateur
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-amber-900">
              {guide.measures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Ce qu&apos;il ne mesure pas
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-amber-900">
              {guide.doesNotMeasure.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Périmètre
            </p>
            <p className="mt-1.5 text-amber-900">{guide.scope}</p>
          </div>

          <p>
            <a
              href={guide.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-amber-900 underline decoration-amber-400 underline-offset-2 hover:text-amber-950"
            >
              {guide.sourceLabel}
            </a>
          </p>
        </div>
      </details>

      {contextAlerts.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-900">
          {contextAlerts.map((alert) => (
            <li key={alert}>{alert}</li>
          ))}
        </ul>
      ) : null}

      {showLimitsLink ? (
        <p>
          <a
            href={`#${ANALYSIS_LIMITS_SECTION_ID}`}
            className="text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
          >
            Retour aux limites de la synthèse
          </a>
        </p>
      ) : null}
    </div>
  );
}
