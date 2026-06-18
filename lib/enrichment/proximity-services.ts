import { createFranceServicesSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type { ProximityServicesSnapshot } from "../types";

const CACHE_FILE = "france-services-by-commune.json";

export function loadProximityServicesSnapshot(
  inseeCode: string,
): ProximityServicesSnapshot {
  if (!isJsonCachePresent(CACHE_FILE)) {
    return {
      year: 2025,
      franceServicesCount: 0,
      structureLabels: [],
      available: false,
      note:
        "Cache France Services absent. Exécutez « npm run ingest:services » pour activer les structures labellisées.",
    };
  }

  const cache = loadJsonCache<
    Record<
      string,
      { year: number; count: number; labels: string[] }
    >
  >(CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2025,
      franceServicesCount: 0,
      structureLabels: [],
      available: false,
      note: "Aucune structure France Services labellisée sur cette commune.",
    };
  }

  return {
    year: entry.year,
    franceServicesCount: entry.count,
    structureLabels: entry.labels,
    available: entry.count > 0,
    note:
      entry.count > 0
        ? "Structures labellisées France Services recensées sur la commune."
        : "Aucune structure France Services labellisée sur la commune.",
  };
}

export { createFranceServicesSource };
