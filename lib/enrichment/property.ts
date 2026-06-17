import { createDvfSource } from "../sources";
import { loadJsonCache } from "./cache";
import type { PropertyCommuneCache, PropertyMarketSnapshot } from "../types";

const PROPERTY_CACHE_FILE = "property-by-commune.json";

export function loadPropertyMarketSnapshot(
  inseeCode: string,
): PropertyMarketSnapshot {
  const cache = loadJsonCache<PropertyCommuneCache>(PROPERTY_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2024,
      medianPricePerM2: null,
      averagePrice: null,
      mutationCount: null,
      available: false,
      note:
        "Cache DVF absent. Exécutez « npm run ingest:property » pour activer les prix immobiliers.",
    };
  }

  return {
    year: entry.year,
    medianPricePerM2: entry.medianPricePerM2,
    averagePrice: entry.averagePrice,
    mutationCount: entry.mutationCount,
    available: true,
    note: "Indicateurs DVF agrégés par commune (prix au m² et volume de mutations).",
  };
}

export { createDvfSource };
