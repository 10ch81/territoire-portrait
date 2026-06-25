import { loadJsonCache } from "@/lib/enrichment/cache";
import type { CommunePortraitResult } from "@/lib/compare/single-portrait";
import type { TerritoryComparisonResult } from "@/lib/compare/types";

export const DEPARTMENT_RANK_INDICATOR_IDS = [
  "density",
  "unemployment_rate",
  "median_income",
  "owner_occupied_share",
  "secondary_residence_share",
  "price_per_m2",
] as const;

export type DepartmentRankIndicatorId = (typeof DEPARTMENT_RANK_INDICATOR_IDS)[number];

export interface DepartmentRankEntry {
  rank: number;
  total: number;
}

export type DepartmentRanksCommuneCache = Record<
  string,
  Partial<Record<DepartmentRankIndicatorId, DepartmentRankEntry>>
>;

const CACHE_FILE = "department-ranks-by-commune.json";

export function computeDepartmentRank(
  valuesByInsee: Map<string, number>,
  targetInsee: string,
  descending: boolean,
): DepartmentRankEntry | null {
  const sorted = [...valuesByInsee.entries()]
    .filter(([, value]) => Number.isFinite(value))
    .sort((left, right) => (descending ? right[1] - left[1] : left[1] - right[1]));

  if (sorted.length < 2) {
    return null;
  }

  const rank = sorted.findIndex(([inseeCode]) => inseeCode === targetInsee) + 1;
  if (rank <= 0) {
    return null;
  }

  return { rank, total: sorted.length };
}

export function formatDepartmentRankLabel(entry: DepartmentRankEntry): string {
  return `${entry.rank}e / ${entry.total} communes (dépt.)`;
}

export function loadDepartmentRanksCache(): DepartmentRanksCommuneCache | null {
  return loadJsonCache<DepartmentRanksCommuneCache>(CACHE_FILE);
}

export function getDepartmentRankLabel(
  inseeCode: string,
  indicatorId: string,
): string | null {
  if (!DEPARTMENT_RANK_INDICATOR_IDS.includes(indicatorId as DepartmentRankIndicatorId)) {
    return null;
  }

  const entry = loadDepartmentRanksCache()?.[inseeCode]?.[indicatorId as DepartmentRankIndicatorId];
  return entry ? formatDepartmentRankLabel(entry) : null;
}

export function attachDepartmentRanksToPortrait(
  portrait: CommunePortraitResult,
  inseeCode: string,
): CommunePortraitResult {
  const cache = loadDepartmentRanksCache()?.[inseeCode];
  if (!cache) {
    return portrait;
  }

  return {
    blocks: portrait.blocks.map((block) => ({
      ...block,
      indicators: block.indicators.map((indicator) => ({
        ...indicator,
        departmentRankLabel:
          cache[indicator.id as DepartmentRankIndicatorId] != null
            ? formatDepartmentRankLabel(cache[indicator.id as DepartmentRankIndicatorId]!)
            : null,
      })),
    })),
  };
}

export function attachDepartmentRanksToComparison(
  comparison: TerritoryComparisonResult,
): TerritoryComparisonResult {
  const ranksCache = loadDepartmentRanksCache();
  if (!ranksCache) {
    return comparison;
  }

  return {
    ...comparison,
    cells: comparison.cells.map((cell) => {
      const entry =
        ranksCache[cell.communeInsee]?.[cell.indicatorId as DepartmentRankIndicatorId];
      return {
        ...cell,
        departmentRankLabel: entry ? formatDepartmentRankLabel(entry) : null,
      };
    }),
  };
}
