"use client";

import { useEffect, useState } from "react";
import { resolveDataLimitSectionLink } from "@/lib/ux/data-limit-links";
import { ANALYSIS_LIMITS_SECTION_ID } from "@/lib/ux/source-guides";

interface AnalysisLimitsPanelProps {
  dataLimits: string[];
  loading?: boolean;
}

function shouldExpandFromHash(): boolean {
  return window.location.hash === `#${ANALYSIS_LIMITS_SECTION_ID}`;
}

export function AnalysisLimitsPanel({
  dataLimits,
  loading = false,
}: AnalysisLimitsPanelProps) {
  const [expanded, setExpanded] = useState(
    () => typeof window !== "undefined" && shouldExpandFromHash(),
  );

  useEffect(() => {
    function handleHashChange() {
      if (shouldExpandFromHash()) {
        setExpanded(true);
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const limitsCount = dataLimits.length;

  return (
    <div
      id={ANALYSIS_LIMITS_SECTION_ID}
      className="mt-6 scroll-mt-16 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
      >
        <h3 className="text-sm font-semibold text-amber-900">
          Limites de la synthèse
        </h3>
        <span className="shrink-0 text-xs font-medium text-amber-900">
          {expanded ? "Masquer ▴" : "Afficher ▾"}
        </span>
      </button>

      {!expanded && !loading && limitsCount > 0 ? (
        <p className="mt-1 text-xs text-amber-700">
          {limitsCount} limite{limitsCount > 1 ? "s" : ""} identifiée
          {limitsCount > 1 ? "s" : ""} pour cette commune.
        </p>
      ) : null}

      {expanded ? (
        <>
          <p className="mt-2 text-sm text-amber-800">
            {loading
              ? "Synthèse en cours de génération. Les limites calculées à partir des sources chargées s'afficheront ici."
              : "Cette synthèse ne remplace pas un diagnostic territorial officiel. Les limites ci-dessous sont calculées à partir des sources réellement chargées pour cette commune."}
          </p>
          {loading ? null : limitsCount > 0 ? (
            <ul className="mt-2 space-y-2 text-sm text-amber-800">
              {dataLimits.map((limit) => {
                const sectionLink = resolveDataLimitSectionLink(limit);

                return (
                  <li
                    key={limit}
                    className="flex flex-col gap-1 sm:flex-row sm:gap-2"
                  >
                    <span className="min-w-0 flex-1">{limit}</span>
                    {sectionLink ? (
                      <a
                        href={`#${sectionLink.sectionId}`}
                        className="shrink-0 text-xs font-medium text-amber-900 underline decoration-amber-400 underline-offset-2 hover:text-amber-950"
                      >
                        Voir {sectionLink.sectionLabel}
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-amber-800">
              Aucune limite spécifique identifiée pour cette commune.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
