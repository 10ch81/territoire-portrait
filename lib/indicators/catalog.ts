import { COMPARE_INDICATORS } from "@/lib/compare/indicators";
import type { PublicIndicatorCatalogEntry } from "./types";

export function buildPublicIndicatorCatalog(): PublicIndicatorCatalogEntry[] {
  return COMPARE_INDICATORS.map((indicator) => ({
    id: indicator.id,
    label: indicator.label,
    definition: indicator.definition,
    valueType: indicator.valueType,
    scale: indicator.scale,
    sourceId: indicator.sourceId,
    sourceName: indicator.sourceName,
    sensitive: indicator.sensitive,
  }));
}
