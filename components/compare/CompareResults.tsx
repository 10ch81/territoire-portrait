"use client";

import { SENSITIVE_INDICATOR_IDS } from "@/lib/indicators/types";
import type { TerritoryComparisonResult } from "@/lib/compare/types";
import { useHideSensitiveIndicators } from "@/lib/ux/sensitive-indicators";
import { SensitiveIndicatorsToggle } from "@/components/SensitiveIndicatorsToggle";
import { CompareHighlights, CompareWarnings } from "./CompareHighlights";
import { CompareTable } from "./CompareTable";

interface CompareResultsProps {
  comparison: TerritoryComparisonResult;
}

export function CompareResults({ comparison }: CompareResultsProps) {
  const { hideSensitive } = useHideSensitiveIndicators();
  const hiddenIndicatorIds = hideSensitive ? SENSITIVE_INDICATOR_IDS : undefined;

  return (
    <>
      <div className="print:hidden">
        <SensitiveIndicatorsToggle />
      </div>
      <CompareHighlights highlights={comparison.highlights} />
      <CompareWarnings warnings={comparison.warnings} />
      <CompareTable comparison={comparison} hiddenIndicatorIds={hiddenIndicatorIds} />
    </>
  );
}
