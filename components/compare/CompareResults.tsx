"use client";

import type { TerritoryComparisonResult } from "@/lib/compare/types";
import {
  filterCompareHighlights,
  getHiddenCompareIndicatorIds,
} from "@/lib/compare/hidden-indicators";
import { useHideSensitiveIndicators } from "@/lib/ux/sensitive-indicators";
import { SensitiveIndicatorsToggle } from "@/components/SensitiveIndicatorsToggle";
import { CompareHighlights, CompareWarnings } from "./CompareHighlights";
import { CompareTable } from "./CompareTable";

interface CompareResultsProps {
  comparison: TerritoryComparisonResult;
}

export function CompareResults({ comparison }: CompareResultsProps) {
  const { hideSensitive } = useHideSensitiveIndicators();
  const hiddenIndicatorIds = getHiddenCompareIndicatorIds(comparison, hideSensitive);
  const highlights = filterCompareHighlights(comparison.highlights, hiddenIndicatorIds);
  const visibleBlocks = comparison.blocks.filter(
    (block) => block.indicatorIds.some((id) => !hiddenIndicatorIds?.has(id)),
  );

  return (
    <div aria-labelledby="compare-results-heading">
      <h2 id="compare-results-heading" className="sr-only">
        Résultats de la comparaison
      </h2>
      <div className="print:hidden">
        <SensitiveIndicatorsToggle />
      </div>
      {visibleBlocks.length > 0 ? (
        <nav
          aria-label="Sections du tableau comparatif"
          className="print:hidden"
        >
          <ul className="mb-4 flex flex-wrap gap-2">
            {visibleBlocks.map((block) => (
              <li key={block.id}>
                <a
                  href={`#compare-${block.id}`}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:border-blue-300 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {block.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <CompareHighlights highlights={highlights} />
      <CompareWarnings warnings={comparison.warnings} />
      <CompareTable comparison={comparison} hiddenIndicatorIds={hiddenIndicatorIds} />
    </div>
  );
}
