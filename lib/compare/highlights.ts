import type { CompareCell, CompareHighlight, CompareIndicatorDefinition } from "./types";
import { COMPARE_THEMATIC_PROFILES } from "./profiles";

const MIN_SPREAD_RATIO = 0.05;

function findBestAndWorst(
  cells: CompareCell[],
  higherIsBetter: boolean,
): { best: CompareCell; worst: CompareCell } | null {
  const numeric = cells.filter(
    (cell) => cell.available && cell.numericValue !== null && Number.isFinite(cell.numericValue),
  );
  if (numeric.length < 2) {
    return null;
  }

  const sorted = [...numeric].sort((a, b) => a.numericValue! - b.numericValue!);
  const worst = sorted[0]!;
  const best = sorted.at(-1)!;

  if (best.communeInsee === worst.communeInsee) {
    return null;
  }

  const spread = Math.abs(best.numericValue! - worst.numericValue!);
  const baseline = Math.max(Math.abs(worst.numericValue!), 1);
  if (spread / baseline < MIN_SPREAD_RATIO && spread < 1) {
    return null;
  }

  if (!higherIsBetter) {
    return { best: worst, worst: best };
  }

  return { best, worst };
}

function communeName(columns: Map<string, string>, insee: string): string {
  return columns.get(insee) ?? insee;
}

export function buildCompareHighlights(input: {
  columns: Array<{ inseeCode: string; name: string }>;
  cells: CompareCell[];
  indicators: CompareIndicatorDefinition[];
}): CompareHighlight[] {
  const highlights: CompareHighlight[] = [];
  const nameByInsee = new Map(input.columns.map((col) => [col.inseeCode, col.name]));
  const indicatorMap = new Map(input.indicators.map((item) => [item.id, item]));

  const cellsByIndicator = new Map<string, CompareCell[]>();
  for (const cell of input.cells) {
    const bucket = cellsByIndicator.get(cell.indicatorId) ?? [];
    bucket.push(cell);
    cellsByIndicator.set(cell.indicatorId, bucket);
  }

  for (const profile of COMPARE_THEMATIC_PROFILES) {
    for (const indicatorId of profile.indicatorIds) {
      const indicator = indicatorMap.get(indicatorId);
      if (!indicator || indicator.higherIsBetter === null) {
        continue;
      }

      const cells = cellsByIndicator.get(indicatorId) ?? [];
      const pair = findBestAndWorst(cells, indicator.higherIsBetter);
      if (!pair) {
        continue;
      }

      const leader = communeName(nameByInsee, pair.best.communeInsee);
      const trailer = communeName(nameByInsee, pair.worst.communeInsee);

      highlights.push({
        profileId: profile.id,
        profileLabel: profile.label,
        indicatorId,
        sentence: `${leader} est ${profile.shortLabel} que ${trailer} sur « ${indicator.label} » (${pair.best.displayValue} vs ${pair.worst.displayValue}).`,
      });
      break;
    }
  }

  return highlights.slice(0, 6);
}
