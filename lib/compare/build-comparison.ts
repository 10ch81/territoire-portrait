import type { TerritoryProfile } from "@/lib/types";
import { collectComparisonReadingAlerts } from "@/lib/indicators/reading-alerts";
import type { BenchmarkRef } from "@/lib/ux/benchmark";
import { COMPARE_BLOCKS, COMPARE_INDICATORS } from "./indicators";
import { buildCompareHighlights } from "./highlights";
import type { CompareCell, TerritoryComparisonResult } from "./types";

export function buildTerritoryComparison(
  territories: TerritoryProfile[],
  options?: { benchmark?: BenchmarkRef },
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
    territories,
    benchmark: options?.benchmark,
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
