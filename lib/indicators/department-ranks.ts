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
  /** Communes du département ayant une valeur pour l'indicateur. */
  rankedCount: number;
  departmentCode: string;
  /** Nombre total de communes du département (API Géo). */
  departmentCommuneCount: number;
}

export type DepartmentRanksCommuneCache = Record<
  string,
  Partial<Record<DepartmentRankIndicatorId, DepartmentRankEntry | LegacyDepartmentRankEntry>>
>;

/** Ancien millésime du cache (rank + total) avant dépt. explicite. */
interface LegacyDepartmentRankEntry {
  rank: number;
  total?: number;
  rankedCount?: number;
  departmentCode?: string;
  departmentCommuneCount?: number;
}

const CACHE_FILE = "department-ranks-by-commune.json";

export function departmentCodeFromInsee(inseeCode: string): string {
  if (inseeCode.startsWith("97") || inseeCode.startsWith("98")) {
    return inseeCode.slice(0, 3);
  }

  return inseeCode.slice(0, 2);
}

export function normalizeDepartmentRankEntry(
  entry: LegacyDepartmentRankEntry,
  inseeCode: string,
): DepartmentRankEntry | null {
  const rankedCount = entry.rankedCount ?? entry.total ?? null;
  const departmentCode = entry.departmentCode ?? departmentCodeFromInsee(inseeCode);

  if (
    !Number.isFinite(entry.rank) ||
    rankedCount === null ||
    !Number.isFinite(rankedCount) ||
    !departmentCode
  ) {
    return null;
  }

  return {
    rank: entry.rank,
    rankedCount,
    departmentCode,
    departmentCommuneCount: entry.departmentCommuneCount ?? rankedCount,
  };
}

export function computeDepartmentRank(
  valuesByInsee: Map<string, number>,
  targetInsee: string,
  descending: boolean,
): Pick<DepartmentRankEntry, "rank" | "rankedCount"> | null {
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

  return { rank, rankedCount: sorted.length };
}

export function formatDepartmentRankLabel(entry: DepartmentRankEntry): string {
  return (
    `${entry.rank}e / ${entry.rankedCount} comm. avec donnée · dépt. ${entry.departmentCode}` +
    ` (${entry.departmentCommuneCount} comm.)`
  );
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
  if (!entry) {
    return null;
  }
  const normalized = normalizeDepartmentRankEntry(entry, inseeCode);
  return normalized ? formatDepartmentRankLabel(normalized) : null;
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
      indicators: block.indicators.map((indicator) => {
        const entry = cache[indicator.id as DepartmentRankIndicatorId];
        const normalized = entry ? normalizeDepartmentRankEntry(entry, inseeCode) : null;
        return {
          ...indicator,
          departmentRankLabel: normalized ? formatDepartmentRankLabel(normalized) : null,
        };
      }),
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
      const normalized = entry
        ? normalizeDepartmentRankEntry(entry, cell.communeInsee)
        : null;
      return {
        ...cell,
        departmentRankLabel: normalized ? formatDepartmentRankLabel(normalized) : null,
      };
    }),
  };
}
