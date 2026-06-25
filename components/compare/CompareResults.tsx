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

  return (
    <>
      <div className="print:hidden">
        <SensitiveIndicatorsToggle />
      </div>
      <CompareHighlights highlights={highlights} />
      <CompareWarnings warnings={comparison.warnings} />
      <CompareTable comparison={comparison} hiddenIndicatorIds={hiddenIndicatorIds} />
    </>
  );
}
