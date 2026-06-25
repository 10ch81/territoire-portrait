import { COMPARE_INDICATORS } from "./indicators";
import type { CompareCell, TerritoryComparisonResult } from "./types";

function getCell(
  cells: CompareCell[],
  indicatorId: string,
  communeInsee: string,
): CompareCell | undefined {
  return cells.find(
    (cell) => cell.indicatorId === indicatorId && cell.communeInsee === communeInsee,
  );
}

export function getIndicatorRows(
  comparison: TerritoryComparisonResult,
  blockId: string,
  options?: { hiddenIndicatorIds?: Set<string> },
): Array<{
  indicator: (typeof COMPARE_INDICATORS)[number];
  cellsByCommune: Map<string, CompareCell>;
}> {
  const block = comparison.blocks.find((item) => item.id === blockId);
  if (!block) {
    return [];
  }

  return block.indicatorIds
    .filter((indicatorId) => !options?.hiddenIndicatorIds?.has(indicatorId))
    .map((indicatorId) => {
      const indicator = COMPARE_INDICATORS.find((item) => item.id === indicatorId);
      if (!indicator) {
        return null;
      }
      const cellsByCommune = new Map<string, CompareCell>();
      for (const column of comparison.columns) {
        const cell = getCell(comparison.cells, indicatorId, column.inseeCode);
        if (cell) {
          cellsByCommune.set(column.inseeCode, cell);
        }
      }
      return { indicator, cellsByCommune };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}
