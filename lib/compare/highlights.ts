import type { TerritoryProfile } from "@/lib/types";
import {
  DEPARTMENT_RANK_INDICATOR_IDS,
  getDepartmentRankLabel,
  loadDepartmentRanksCache,
  normalizeDepartmentRankEntry,
  type DepartmentRankIndicatorId,
} from "@/lib/indicators/department-ranks";
import { benchmarkLabel, type BenchmarkRef } from "@/lib/ux/benchmark";
import type { CompareCell, CompareHighlight, CompareIndicatorDefinition } from "./types";
import { COMPARE_THEMATIC_PROFILES } from "./profiles";

const MIN_SPREAD_RATIO = 0.05;

function communeName(columns: Map<string, string>, insee: string): string {
  return columns.get(insee) ?? insee;
}

function formatSignedPercentDelta(value: number, reference: number): string {
  const pct = Math.round(((value - reference) / Math.max(Math.abs(reference), 1)) * 100);
  if (pct > 0) {
    return `+${pct} %`;
  }
  if (pct < 0) {
    return `${pct} %`;
  }
  return "proche de la référence";
}

function getNumericCells(cells: CompareCell[]): CompareCell[] {
  return cells.filter(
    (cell) => cell.available && cell.numericValue !== null && Number.isFinite(cell.numericValue),
  );
}

function hasMeaningfulSpread(values: number[]): boolean {
  if (values.length < 2) {
    return false;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const spread = sorted.at(-1)! - sorted[0]!;
  const baseline = Math.max(Math.abs(sorted[0]!), 1);
  return spread / baseline >= MIN_SPREAD_RATIO || spread >= 1;
}

function getEpciReference(
  territory: TerritoryProfile,
  indicatorId: string,
): number | null {
  const epci = territory.enrichment?.geography?.epciComparison;
  if (!epci?.available) {
    return null;
  }
  if (indicatorId === "density") {
    return epci.epciAverageDensity;
  }
  if (indicatorId === "population") {
    return epci.epciAveragePopulation;
  }
  return null;
}

function getTerritoryByInsee(
  territories: TerritoryProfile[],
  insee: string,
): TerritoryProfile | undefined {
  return territories.find((territory) => territory.inseeCode === insee);
}

function buildGroupMeanHighlight(
  profile: (typeof COMPARE_THEMATIC_PROFILES)[number],
  indicator: CompareIndicatorDefinition,
  cells: CompareCell[],
  nameByInsee: Map<string, string>,
  referenceLabel: string,
): CompareHighlight | null {
  const numeric = getNumericCells(cells);
  if (numeric.length < 2) {
    return null;
  }

  const values = numeric.map((cell) => cell.numericValue!);
  if (!hasMeaningfulSpread(values)) {
    return null;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const target = [...numeric].sort(
    (left, right) =>
      Math.abs(right.numericValue! - mean) - Math.abs(left.numericValue! - mean),
  )[0]!;

  const delta = formatSignedPercentDelta(target.numericValue!, mean);
  const meanDisplay = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: Math.abs(mean) < 10 ? 1 : 0,
  }).format(mean);

  return {
    profileId: profile.id,
    profileLabel: profile.label,
    indicatorId: indicator.id,
    sentence: `${communeName(nameByInsee, target.communeInsee)} : « ${indicator.label} » ${target.displayValue}, ${delta} vs ${referenceLabel} (${meanDisplay} en moyenne sur le groupe).`,
  };
}

function buildEpciHighlight(
  profile: (typeof COMPARE_THEMATIC_PROFILES)[number],
  indicator: CompareIndicatorDefinition,
  cells: CompareCell[],
  territories: TerritoryProfile[],
  nameByInsee: Map<string, string>,
): CompareHighlight | null {
  const numeric = getNumericCells(cells);
  if (numeric.length === 0) {
    return null;
  }

  let bestCell: CompareCell | null = null;
  let bestReference: number | null = null;
  let bestDeviation = -1;

  for (const cell of numeric) {
    const territory = getTerritoryByInsee(territories, cell.communeInsee);
    if (!territory) {
      continue;
    }
    const reference = getEpciReference(territory, indicator.id);
    if (reference === null) {
      continue;
    }
    const deviation = Math.abs(cell.numericValue! - reference);
    if (deviation > bestDeviation) {
      bestDeviation = deviation;
      bestCell = cell;
      bestReference = reference;
    }
  }

  if (!bestCell || bestReference === null || bestDeviation === 0) {
    return null;
  }

  const refLabel = benchmarkLabel("epci");
  const delta = formatSignedPercentDelta(bestCell.numericValue!, bestReference);

  return {
    profileId: profile.id,
    profileLabel: profile.label,
    indicatorId: indicator.id,
    sentence: `${communeName(nameByInsee, bestCell.communeInsee)} : « ${indicator.label} » ${bestCell.displayValue}, ${delta} vs ${refLabel}.`,
  };
}

function buildDepartementHighlight(
  profile: (typeof COMPARE_THEMATIC_PROFILES)[number],
  indicator: CompareIndicatorDefinition,
  cells: CompareCell[],
  nameByInsee: Map<string, string>,
): CompareHighlight | null {
  if (
    !DEPARTMENT_RANK_INDICATOR_IDS.includes(indicator.id as DepartmentRankIndicatorId)
  ) {
    return null;
  }

  const ranksCache = loadDepartmentRanksCache();
  if (!ranksCache) {
    return null;
  }

  const ranked = cells
    .map((cell) => {
      const entry = ranksCache[cell.communeInsee]?.[indicator.id as DepartmentRankIndicatorId];
      const normalized = entry
        ? normalizeDepartmentRankEntry(entry, cell.communeInsee)
        : null;
      if (!normalized || !cell.available) {
        return null;
      }
      return { cell, normalized };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (ranked.length === 0) {
    return null;
  }

  const sorted = [...ranked].sort((left, right) => {
    if (indicator.higherIsBetter) {
      return left.normalized.rank - right.normalized.rank;
    }
    return right.normalized.rank - left.normalized.rank;
  });
  const target = sorted[0]!;
  const rankLabel =
    target.cell.departmentRankLabel ??
    getDepartmentRankLabel(target.cell.communeInsee, indicator.id);

  if (!rankLabel) {
    return null;
  }

  return {
    profileId: profile.id,
    profileLabel: profile.label,
    indicatorId: indicator.id,
    sentence: `${communeName(nameByInsee, target.cell.communeInsee)} : « ${indicator.label} » — ${rankLabel} (réf. ${benchmarkLabel("departement")}).`,
  };
}

function buildHighlightForIndicator(input: {
  profile: (typeof COMPARE_THEMATIC_PROFILES)[number];
  indicator: CompareIndicatorDefinition;
  cells: CompareCell[];
  territories: TerritoryProfile[];
  nameByInsee: Map<string, string>;
  benchmark: BenchmarkRef;
}): CompareHighlight | null {
  switch (input.benchmark) {
    case "epci":
      return (
        buildEpciHighlight(
          input.profile,
          input.indicator,
          input.cells,
          input.territories,
          input.nameByInsee,
        ) ??
        buildGroupMeanHighlight(
          input.profile,
          input.indicator,
          input.cells,
          input.nameByInsee,
          benchmarkLabel("similaires"),
        )
      );
    case "departement":
      return (
        buildDepartementHighlight(
          input.profile,
          input.indicator,
          input.cells,
          input.nameByInsee,
        ) ??
        buildGroupMeanHighlight(
          input.profile,
          input.indicator,
          input.cells,
          input.nameByInsee,
          benchmarkLabel("similaires"),
        )
      );
    case "similaires":
      return buildGroupMeanHighlight(
        input.profile,
        input.indicator,
        input.cells,
        input.nameByInsee,
        benchmarkLabel("similaires"),
      );
    default: {
      const _exhaustive: never = input.benchmark;
      return _exhaustive;
    }
  }
}

export function buildCompareHighlights(input: {
  columns: Array<{ inseeCode: string; name: string }>;
  cells: CompareCell[];
  indicators: CompareIndicatorDefinition[];
  territories?: TerritoryProfile[];
  benchmark?: BenchmarkRef;
}): CompareHighlight[] {
  const highlights: CompareHighlight[] = [];
  const nameByInsee = new Map(input.columns.map((col) => [col.inseeCode, col.name]));
  const indicatorMap = new Map(input.indicators.map((item) => [item.id, item]));
  const benchmark = input.benchmark ?? "epci";
  const territories = input.territories ?? [];

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
      const highlight = buildHighlightForIndicator({
        profile,
        indicator,
        cells,
        territories,
        nameByInsee,
        benchmark,
      });
      if (!highlight) {
        continue;
      }

      highlights.push(highlight);
      break;
    }
  }

  return highlights.slice(0, 6);
}
