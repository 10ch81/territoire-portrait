import { SENSITIVE_INDICATOR_IDS } from "@/lib/indicators/types";
import type { CompareHighlight, TerritoryComparisonResult } from "./types";

export function getHiddenCompareIndicatorIds(
  comparison: TerritoryComparisonResult,
  hideSensitive: boolean,
): Set<string> | undefined {
  if (!hideSensitive) {
    return undefined;
  }

  const hidden = new Set(SENSITIVE_INDICATOR_IDS);
  for (const cell of comparison.cells) {
    if (cell.fragile) {
      hidden.add(cell.indicatorId);
    }
  }
  return hidden;
}

export function filterCompareHighlights(
  highlights: CompareHighlight[],
  hiddenIndicatorIds: Set<string> | undefined,
): CompareHighlight[] {
  if (!hiddenIndicatorIds) {
    return highlights;
  }
  return highlights.filter((item) => !hiddenIndicatorIds.has(item.indicatorId));
}
