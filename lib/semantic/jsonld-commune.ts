import type { CommunePortraitResult } from "@/lib/compare/single-portrait";
import { isSensitiveIndicator } from "@/lib/indicators/types";
import type { DataSource, TerritoryProfile } from "@/lib/types";
import { JSONLD_CONTEXT } from "./vocab";

export interface CommuneJsonLdOptions {
  includeSensitive?: boolean;
}

export interface CommuneJsonLdDocument {
  "@context": typeof JSONLD_CONTEXT;
  "@type": "AdministrativeArea";
  "@id": string;
  name: string;
  identifier: string;
  url: string;
  generatedAt: string;
  observation: Array<Record<string, unknown>>;
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

export function buildCommuneJsonLd(input: {
  territory: TerritoryProfile;
  portrait: CommunePortraitResult;
  baseUrl: string;
  options?: CommuneJsonLdOptions;
}): CommuneJsonLdDocument {
  const { territory, portrait, baseUrl, options } = input;
  const inseeCode = territory.inseeCode;
  const includeSensitive = options?.includeSensitive ?? false;
  const observations: Array<Record<string, unknown>> = [];

  for (const block of portrait.blocks) {
    for (const indicator of block.indicators) {
      if (!indicator.available) {
        continue;
      }
      if (!includeSensitive && (indicator.sensitive || isSensitiveIndicator(indicator.id))) {
        continue;
      }

      observations.push({
        "@type": "PropertyValue",
        propertyID: indicator.id,
        name: indicator.label,
        description: indicator.definition,
        value: indicator.displayValue,
        vintage: indicator.vintage,
        fragile: indicator.fragile,
        sensitive: indicator.sensitive,
        scale: indicator.scale,
        block: block.label,
        ...(indicator.departmentRankLabel
          ? { departmentRank: indicator.departmentRankLabel }
          : {}),
        ...(indicator.warning ? { disambiguatingDescription: indicator.warning } : {}),
        sourceDataset: {
          "@type": "Dataset",
          identifier: indicator.sourceId,
          name: indicator.sourceName,
        },
      });
    }
  }

  return {
    "@context": JSONLD_CONTEXT,
    "@type": "AdministrativeArea",
    "@id": `${baseUrl}/commune/${inseeCode}#territory`,
    name: territory.name,
    identifier: inseeCode,
    url: `${baseUrl}/commune/${inseeCode}`,
    generatedAt: new Date().toISOString(),
    observation: observations,
    isBasedOn: territory.sources.map(sourceToJsonLd),
  };
}
