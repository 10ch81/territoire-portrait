import { buildTerritoryComparison, getCell } from "@/lib/compare/build-comparison";
import {
  filterCompareHighlights,
  getHiddenCompareIndicatorIds,
} from "@/lib/compare/hidden-indicators";
import { COMPARE_INDICATOR_MAP } from "@/lib/compare/indicators";
import {
  filterHighlightsByPriorities,
  shouldFilterByPriorities,
} from "@/lib/compare/user-priorities";
import type { TerritoryComparisonResult } from "@/lib/compare/types";
import { isSensitiveIndicator } from "@/lib/indicators/types";
import type { DataSource, TerritoryProfile } from "@/lib/types";
import { JSONLD_CONTEXT } from "./vocab";

export interface CompareJsonLdOptions {
  includeSensitive?: boolean;
  priorityIds?: string[];
}

export interface CompareJsonLdDocument {
  "@context": typeof JSONLD_CONTEXT;
  "@type": "ItemList";
  "@id": string;
  name: string;
  url: string;
  generatedAt: string;
  priorities?: string[];
  itemListElement: Array<Record<string, unknown>>;
  comparisonObservation: Array<Record<string, unknown>>;
  highlights: Array<Record<string, unknown>>;
  readingLimits: string[];
  isBasedOn: Array<Record<string, unknown>>;
}

function sourceToJsonLd(source: DataSource): Record<string, unknown> {
  return {
    "@type": "Dataset",
    identifier: source.id,
    name: source.name,
    url: source.url,
    description: source.description,
    dateModified: source.accessedAt,
  };
}

function shouldIncludeIndicator(
  indicatorId: string,
  metaSensitive: boolean,
  includeSensitive: boolean,
  hiddenIndicatorIds: Set<string> | undefined,
): boolean {
  if (hiddenIndicatorIds?.has(indicatorId)) {
    return false;
  }
  if (!includeSensitive && (metaSensitive || isSensitiveIndicator(indicatorId))) {
    return false;
  }
  return true;
}

export function buildCompareJsonLd(input: {
  territories: TerritoryProfile[];
  comparison: TerritoryComparisonResult;
  baseUrl: string;
  compareUrl: string;
  options?: CompareJsonLdOptions;
}): CompareJsonLdDocument {
  const { territories, comparison, baseUrl, compareUrl, options } = input;
  const includeSensitive = options?.includeSensitive ?? false;
  const priorityIds = options?.priorityIds ?? [];
  const hiddenIndicatorIds = getHiddenCompareIndicatorIds(comparison, !includeSensitive);

  const itemListElement = comparison.columns.map((column, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "AdministrativeArea",
      "@id": `${baseUrl}/commune/${column.inseeCode}#territory`,
      name: column.name,
      identifier: column.inseeCode,
      url: `${baseUrl}${column.profileLink}`,
      ...(column.departmentLabel ? { description: column.departmentLabel } : {}),
    },
  }));

  const comparisonObservation: Array<Record<string, unknown>> = [];

  for (const block of comparison.blocks) {
    for (const indicatorId of block.indicatorIds) {
      const meta = COMPARE_INDICATOR_MAP.get(indicatorId);
      if (!meta) {
        continue;
      }
      if (
        !shouldIncludeIndicator(
          indicatorId,
          meta.sensitive,
          includeSensitive,
          hiddenIndicatorIds,
        )
      ) {
        continue;
      }

      const valuesByCommune = comparison.columns.map((column) => {
        const cell = getCell(comparison.cells, indicatorId, column.inseeCode);
        return {
          identifier: column.inseeCode,
          name: column.name,
          value: cell?.displayValue ?? "Donnée non disponible",
          available: cell?.available ?? false,
          vintage: cell?.vintage ?? null,
          fragile: cell?.fragile ?? false,
          ...(cell?.departmentRankLabel
            ? { departmentRank: cell.departmentRankLabel }
            : {}),
          ...(cell?.warning ? { disambiguatingDescription: cell.warning } : {}),
        };
      });

      if (!valuesByCommune.some((entry) => entry.available)) {
        continue;
      }

      comparisonObservation.push({
        "@type": "PropertyValue",
        propertyID: indicatorId,
        name: meta.label,
        description: meta.definition,
        block: block.label,
        valueType: meta.valueType,
        scale: meta.scale,
        valuesByCommune,
        sourceDataset: {
          "@type": "Dataset",
          identifier: meta.sourceId,
          name: meta.sourceName,
        },
      });
    }
  }

  const prioritizedHighlights = filterHighlightsByPriorities(
    comparison.highlights,
    priorityIds,
  );
  const highlights = filterCompareHighlights(
    prioritizedHighlights,
    hiddenIndicatorIds,
  ).map((item) => ({
    profileId: item.profileId,
    profileLabel: item.profileLabel,
    sentence: item.sentence,
    indicatorId: item.indicatorId,
  }));

  const sourceMap = new Map<string, DataSource>();
  for (const territory of territories) {
    for (const source of territory.sources) {
      sourceMap.set(source.id, source);
    }
  }

  const communeNames = comparison.columns.map((column) => column.name).join(", ");

  return {
    "@context": JSONLD_CONTEXT,
    "@type": "ItemList",
    "@id": `${baseUrl}${compareUrl}`,
    name: `Comparaison : ${communeNames}`,
    url: `${baseUrl}${compareUrl}`,
    generatedAt: new Date().toISOString(),
    ...(shouldFilterByPriorities(priorityIds) ? { priorities: priorityIds } : {}),
    itemListElement,
    comparisonObservation,
    highlights,
    readingLimits: comparison.warnings,
    isBasedOn: [...sourceMap.values()].map(sourceToJsonLd),
  };
}

/** Utilitaire tests — construit comparaison + JSON-LD sans enrichissement live. */
export function buildCompareJsonLdFromTerritories(
  territories: TerritoryProfile[],
  baseUrl: string,
  compareUrl: string,
  options?: CompareJsonLdOptions,
): CompareJsonLdDocument {
  const comparison = buildTerritoryComparison(territories);
  return buildCompareJsonLd({
    territories,
    comparison,
    baseUrl,
    compareUrl,
    options,
  });
}
