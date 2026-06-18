import { createQpvSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type { QpvCommuneCache, QpvSnapshot } from "../types";

const QPV_CACHE_FILE = "qpv-by-commune.json";

export function loadQpvSnapshot(inseeCode: string): QpvSnapshot {
  if (!isJsonCachePresent(QPV_CACHE_FILE)) {
    return {
      year: 2025,
      hasQpv: false,
      qpvCount: 0,
      qpvLabels: [],
      available: false,
      note: "Cache QPV absent. Exécutez « npm run ingest:qpv » pour activer la politique de la ville.",
    };
  }

  const cache = loadJsonCache<QpvCommuneCache>(QPV_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry || entry.qpvLabels.length === 0) {
    return {
      year: 2025,
      hasQpv: false,
      qpvCount: 0,
      qpvLabels: [],
      available: true,
      note:
        "Quartiers prioritaires de la politique de la ville (QPV 2024, table INSEE TAG 2025).",
    };
  }

  return {
    year: entry.year,
    hasQpv: true,
    qpvCount: entry.qpvLabels.length,
    qpvLabels: entry.qpvLabels,
    available: true,
    note:
      "Quartiers prioritaires de la politique de la ville (QPV 2024, table INSEE TAG 2025).",
  };
}

export { createQpvSource };
