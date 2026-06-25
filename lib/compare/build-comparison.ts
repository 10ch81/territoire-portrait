import type { TerritoryProfile } from "@/lib/types";
import { collectComparisonReadingAlerts } from "@/lib/indicators/reading-alerts";
import { COMPARE_BLOCKS, COMPARE_INDICATORS } from "./indicators";
import { buildCompareHighlights } from "./highlights";
import type { CompareCell, TerritoryComparisonResult } from "./types";

export function buildTerritoryComparison(
  territories: TerritoryProfile[],
): TerritoryComparisonResult {
  const columns = territories.map((territory) => ({
    inseeCode: territory.inseeCode,
    name: territory.name,
    departmentLabel: territory.department
      ? `${territory.department.name} (${territory.department.code})`
      : null,
    profileLink: `/commune/${territory.inseeCode}`,
  }));

  const cells: CompareCell[] = [];

  for (const indicator of COMPARE_INDICATORS) {
    for (const territory of territories) {
      const extracted = indicator.extract(territory);
      cells.push({
        indicatorId: indicator.id,
        communeInsee: territory.inseeCode,
        ...extracted,
      });
    }
  }

  const highlights = buildCompareHighlights({
    columns,
    cells,
    indicators: COMPARE_INDICATORS,
  });

  return {
    columns,
    blocks: COMPARE_BLOCKS.map((block) => ({
      id: block.id,
      label: block.label,
      indicatorIds: [...block.indicatorIds],
    })),
    cells,
    highlights,
    warnings: collectComparisonReadingAlerts(territories),
  };
}

export function getCell(
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
