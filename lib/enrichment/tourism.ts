import { createTourismSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type { TourismSnapshot } from "../types";

const CACHE_FILE = "tourism-by-commune.json";

export function loadTourismSnapshot(inseeCode: string): TourismSnapshot {
  if (!isJsonCachePresent(CACHE_FILE)) {
    return {
      year: 2025,
      accommodationPlaces: 0,
      available: false,
      note:
        "Cache tourisme absent. Exécutez « npm run ingest:tourism » pour activer les capacités d'hébergement.",
    };
  }

  const cache = loadJsonCache<
    Record<string, { year: number; accommodationPlaces: number }>
  >(CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2025,
      accommodationPlaces: 0,
      available: false,
      note: "Aucune capacité d'hébergement touristique recensée sur cette commune.",
    };
  }

  return {
    year: entry.year,
    accommodationPlaces: entry.accommodationPlaces,
    available: entry.accommodationPlaces > 0,
    note:
      "Capacités d'hébergement touristique (hôtels, campings, etc.) — INSEE, toutes catégories confondues. Pas de données de fréquentation : potentiel à approfondir, pas de conclusion sur sous-exploitation.",
  };
}

export { createTourismSource };
