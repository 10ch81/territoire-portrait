import type { TerritoryProfile } from "@/lib/types";
import { COMPARE_BLOCKS, COMPARE_INDICATORS } from "./indicators";
import type { CompareBlockId } from "./types";

export interface CommunePortraitIndicator {
  id: string;
  label: string;
  definition: string;
  sourceName: string;
  sourceId: string;
  displayValue: string;
  vintage: number | string | null;
  fragile: boolean;
  warning: string | null;
  available: boolean;
  sensitive: boolean;
  scale: string;
  departmentRankLabel: string | null;
}

export interface CommunePortraitBlock {
  id: CompareBlockId;
  label: string;
  indicators: CommunePortraitIndicator[];
}

export interface CommunePortraitResult {
  blocks: CommunePortraitBlock[];
}

export function buildCommunePortrait(territory: TerritoryProfile): CommunePortraitResult {
  const blocks: CommunePortraitBlock[] = [];

  for (const block of COMPARE_BLOCKS) {
    const indicators: CommunePortraitIndicator[] = [];

    for (const indicatorId of block.indicatorIds) {
      const indicator = COMPARE_INDICATORS.find((item) => item.id === indicatorId);
      if (!indicator) {
        continue;
      }

      const extracted = indicator.extract(territory);
      indicators.push({
        id: indicator.id,
        label: indicator.label,
        definition: indicator.definition,
        sourceName: indicator.sourceName,
        sourceId: indicator.sourceId,
        displayValue: extracted.displayValue,
        vintage: extracted.vintage,
        fragile: extracted.fragile,
        warning: extracted.warning,
        available: extracted.available,
        sensitive: indicator.sensitive,
        scale: indicator.scale,
        departmentRankLabel: null,
      });
    }

    blocks.push({
      id: block.id,
      label: block.label,
      indicators,
    });
  }

  return { blocks };
}
