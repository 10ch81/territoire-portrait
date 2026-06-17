import { createRplsSource } from "../sources";
import { loadJsonCache } from "./cache";
import type { HousingCommuneCache, SocialHousingSnapshot } from "../types";

const HOUSING_CACHE_FILE = "housing-by-commune.json";

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
      available: false,
      note:
        "Cache RPLS absent. Exécutez « npm run ingest:housing » pour activer les données de logements sociaux.",
    };
  }

  return {
    year: entry.year,
    totalUnits: entry.totalUnits,
    occupiedUnits: entry.occupiedUnits,
    vacantUnits: entry.vacantUnits,
    available: true,
    note:
      "Parc locatif social (RPLS) agrégé par commune. Millésime indicatif du fichier source.",
  };
}

export { createRplsSource };
