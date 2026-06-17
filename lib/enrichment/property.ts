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
      averagePricePerM2: null,
      averageTransactionPrice: null,
      mutationCount: null,
      available: false,
      note:
        "Cache DVF absent. Exécutez « npm run ingest:property » pour activer les prix immobiliers.",
    };
  }

  return {
    year: entry.year,
    averagePricePerM2: entry.averagePricePerM2,
    averageTransactionPrice: entry.averageTransactionPrice,
    mutationCount: entry.mutationCount,
    available: true,
    note:
      "Indicateurs DVF agrégés par commune (prix moyen au m² et prix moyen des mutations).",
  };
}

export { createDvfSource };
