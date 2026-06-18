import { createEducationSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type {
  EducationAggregateCount,
  EducationCommuneCache,
  EducationSnapshot,
} from "../types";

const CACHE_FILE = "education-by-commune.json";

function mapCounts(record: Record<string, number>): EducationAggregateCount[] {
  return Object.entries(record)
    .map(([label, count]) => ({ code: label, label, count }))
    .sort((a, b) => b.count - a.count);
}

export function loadEducationSnapshot(inseeCode: string): EducationSnapshot {
  if (!isJsonCachePresent(CACHE_FILE)) {
    return {
      year: 2026,
      totalOpen: 0,
      byType: [],
      bySector: [],
      byLevel: [],
      available: false,
      note:
        "Cache Annuaire Éducation absent. Exécutez « npm run ingest:education » pour activer la scolarisation.",
    };
  }

  const cache = loadJsonCache<EducationCommuneCache>(CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry || entry.totalOpen === 0) {
    return {
      year: 2026,
      totalOpen: 0,
      byType: [],
      bySector: [],
      byLevel: [],
      available: false,
      note: "Aucun établissement scolaire ouvert recensé sur cette commune.",
    };
  }

  return {
    year: entry.year,
    totalOpen: entry.totalOpen,
    byType: mapCounts(entry.byType),
    bySector: mapCounts(entry.bySector),
    byLevel: mapCounts(entry.byLevel),
    available: true,
    note:
      "Annuaire de l'Éducation — établissements ouverts ; complémentaire au dénombrement BPE (domaine C).",
  };
}

export { createEducationSource };
