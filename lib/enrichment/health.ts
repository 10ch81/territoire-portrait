import { createFinessSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type {
  FinessCommuneCache,
  HealthCategoryCount,
  HealthSnapshot,
} from "../types";

const CACHE_FILE = "finess-by-commune.json";

function mapCounts(record: Record<string, number>): HealthCategoryCount[] {
  return Object.entries(record)
    .map(([label, count]) => ({ code: label, label, count }))
    .sort((a, b) => b.count - a.count);
}

export function loadHealthSnapshot(inseeCode: string): HealthSnapshot {
  if (!isJsonCachePresent(CACHE_FILE)) {
    return {
      year: 2026,
      totalEstablishments: 0,
      totalCapacity: null,
      byCategory: [],
      byType: [],
      available: false,
      note:
        "Cache FINESS absent. Exécutez « npm run ingest:finess » pour activer les établissements sanitaires et sociaux.",
    };
  }

  const cache = loadJsonCache<FinessCommuneCache>(CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry || entry.total === 0) {
    return {
      year: 2026,
      totalEstablishments: 0,
      totalCapacity: null,
      byCategory: [],
      byType: [],
      available: false,
      note: "Aucun établissement FINESS recensé sur cette commune.",
    };
  }

  return {
    year: entry.year,
    totalEstablishments: entry.total,
    totalCapacity: entry.totalCapacity,
    byCategory: mapCounts(entry.byCategory),
    byType: mapCounts(entry.byType),
    available: true,
    note:
      "Référentiel FINESS (établissements ouverts) — complète le dénombrement BPE sans mesurer l'accessibilité spatiale.",
  };
}

export { createFinessSource };
