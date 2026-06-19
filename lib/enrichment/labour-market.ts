import { createFranceTravailSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type { FranceTravailCommuneCache, LabourMarketSnapshot } from "../types";

const CACHE_FILE = "france-travail-by-commune.json";

const METHOD_NOTE =
  "Inscrits France Travail (catégorie ABC, moyenne trimestrielle) — distinct du taux de chômage RP (BIT recensement) ; effectifs arrondis au multiple de 5 ; prudence 2025+ (réforme inscription automatique).";

export function loadLabourMarketSnapshot(inseeCode: string): LabourMarketSnapshot {
  if (!isJsonCachePresent(CACHE_FILE)) {
    return {
      quarter: null,
      totalJobSeekers: null,
      categoryA: null,
      under25: null,
      age50AndOver: null,
      longTerm: null,
      available: false,
      note:
        "Cache France Travail absent. Exécutez « npm run ingest:france-travail » pour activer la demande d'emploi trimestrielle.",
    };
  }

  const cache = loadJsonCache<FranceTravailCommuneCache>(CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry || entry.totalJobSeekers === null) {
    return {
      quarter: entry?.quarter ?? null,
      totalJobSeekers: null,
      categoryA: null,
      under25: entry?.under25 ?? null,
      age50AndOver: entry?.age50AndOver ?? null,
      longTerm: null,
      available: false,
      note: entry
        ? "Aucun inscrit France Travail recensé pour ce trimestre sur la commune."
        : "Commune absente du cache France Travail pour le trimestre chargé.",
    };
  }

  return {
    quarter: entry.quarter,
    totalJobSeekers: entry.totalJobSeekers,
    categoryA: entry.categoryA,
    under25: entry.under25,
    age50AndOver: entry.age50AndOver,
    longTerm: entry.longTerm,
    available: true,
    note: METHOD_NOTE,
  };
}

export { createFranceTravailSource };
