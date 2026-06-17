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
      houseMutations: null,
      apartmentMutations: null,
      houseSharePercent: null,
      apartmentSharePercent: null,
      priceHistory: [],
      departmentCode: null,
      departmentAveragePricePerM2: null,
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
    houseMutations: entry.houseMutations ?? null,
    apartmentMutations: entry.apartmentMutations ?? null,
    houseSharePercent: entry.houseSharePercent ?? null,
    apartmentSharePercent: entry.apartmentSharePercent ?? null,
    priceHistory: entry.priceHistory ?? [],
    departmentCode: entry.departmentCode ?? null,
    departmentAveragePricePerM2: entry.departmentAveragePricePerM2 ?? null,
    available: true,
    note:
      "Indicateurs DVF agrégés par commune (série 2014-2024, répartition maisons/appartements, comparatif départemental).",
  };
}

export { createDvfSource };
