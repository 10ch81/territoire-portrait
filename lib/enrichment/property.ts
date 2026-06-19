import { createDvfSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type { PropertyCommuneCache, PropertyMarketSnapshot } from "../types";

const PROPERTY_CACHE_FILE = "property-by-commune.json";

const DVF_EXCLUDED_METROPOLITAN_DEPARTMENTS = new Set(["57", "67", "68"]);

function departmentPrefixFromInsee(inseeCode: string): string {
  if (inseeCode.startsWith("97") || inseeCode.startsWith("98")) {
    return inseeCode.slice(0, 3);
  }

  return inseeCode.slice(0, 2);
}

function isDvfExcludedTerritory(inseeCode: string): boolean {
  if (inseeCode.startsWith("976")) {
    return true;
  }

  return DVF_EXCLUDED_METROPOLITAN_DEPARTMENTS.has(
    departmentPrefixFromInsee(inseeCode),
  );
}

function unavailablePropertyNote(inseeCode: string): string {
  if (!isJsonCachePresent(PROPERTY_CACHE_FILE)) {
    return "Cache DVF absent. Exécutez « npm run ingest:property » pour activer les prix immobiliers.";
  }

  if (isDvfExcludedTerritory(inseeCode)) {
    return "Prix DVF non diffusés pour l'Alsace-Moselle et Mayotte (Livre foncier local, hors périmètre DGFiP). Aucune source publique équivalente n'est disponible à l'échelle communale.";
  }

  return "Aucune mutation DVF agrégée disponible pour cette commune dans le millésime courant.";
}

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
      departmentCode: isDvfExcludedTerritory(inseeCode)
        ? departmentPrefixFromInsee(inseeCode)
        : null,
      departmentAveragePricePerM2: null,
      available: false,
      note: unavailablePropertyNote(inseeCode),
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
      "Prix DVF : moyennes agrégées sur les mutations enregistrées (série 2014-2024). Pas de distinction neuf/ancien, standing, biens atypiques, lots multiples, dépendances ni terrains nus ; comparatif départemental indicatif.",
  };
}

export { createDvfSource };
