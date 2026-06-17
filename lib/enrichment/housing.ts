import { createRplsSource } from "../sources";
import { loadJsonCache } from "./cache";
import type { HousingCommuneCache, SocialHousingSnapshot } from "../types";

const HOUSING_CACHE_FILE = "housing-by-commune.json";

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function loadSocialHousingSnapshot(
  inseeCode: string,
): SocialHousingSnapshot {
  const cache = loadJsonCache<HousingCommuneCache>(HOUSING_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2021,
      totalUnits: null,
      occupiedUnits: null,
      vacantUnits: null,
      totalDwellings: null,
      socialHousingSharePercent: null,
      vacancyRatePercent: null,
      available: false,
      note:
        "Cache RPLS absent. Exécutez « npm run ingest:housing » pour activer les données de logements sociaux.",
    };
  }

  const vacancyRatePercent =
    entry.totalUnits > 0
      ? roundOneDecimal((entry.vacantUnits / entry.totalUnits) * 100)
      : null;

  const socialHousingSharePercent =
    entry.totalDwellings && entry.totalDwellings > 0
      ? roundOneDecimal((entry.totalUnits / entry.totalDwellings) * 100)
      : null;

  return {
    year: entry.year,
    totalUnits: entry.totalUnits,
    occupiedUnits: entry.occupiedUnits,
    vacantUnits: entry.vacantUnits,
    totalDwellings: entry.totalDwellings ?? null,
    socialHousingSharePercent,
    vacancyRatePercent,
    available: true,
    note:
      "Parc locatif social (RPLS) agrégé par commune, avec part du parc global (RP logement 2021).",
  };
}

export { createRplsSource };
