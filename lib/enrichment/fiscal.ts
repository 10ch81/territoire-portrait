import { createReiSource } from "../sources";
import { loadJsonCache } from "./cache";
import type { FiscalCommuneCache, LocalTaxSnapshot } from "../types";

const FISCAL_CACHE_FILE = "fiscal-by-commune.json";

export function loadLocalTaxSnapshot(inseeCode: string): LocalTaxSnapshot {
  const cache = loadJsonCache<FiscalCommuneCache>(FISCAL_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2024,
      propertyTaxBuiltRate: null,
      propertyTaxUnbuiltRate: null,
      habitationTaxRate: null,
      available: false,
      note:
        "Cache REI absent. Exécutez « npm run ingest:rei » pour activer la fiscalité locale.",
    };
  }

  return {
    year: entry.year,
    propertyTaxBuiltRate: entry.propertyTaxBuiltRate,
    propertyTaxUnbuiltRate: entry.propertyTaxUnbuiltRate,
    habitationTaxRate: entry.habitationTaxRate,
    available: true,
    note:
      "Taux d'imposition communaux issus du fichier REI (impôts locaux, DGFiP).",
  };
}

export { createReiSource };
