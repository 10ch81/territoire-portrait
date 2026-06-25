import {
  createLovacSource,
  createRplsSource,
  createRpHousingSource,
  LOVAC_VINTAGE,
  RP_VINTAGE,
  RPLS_VINTAGE,
} from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type {
  HousingCommuneCache,
  LovacCommuneCache,
  SocialHousingSnapshot,
} from "../types";

const HOUSING_CACHE_FILE = "housing-by-commune.json";
const LOVAC_CACHE_FILE = "lovac-by-commune.json";

const LOVAC_SUPPRESSED_NOTE =
  "Donnée LOVAC non diffusée (secret statistique : moins de 11 logements vacants du parc privé).";

const LOVAC_MISSING_NOTE =
  "Donnée LOVAC absente pour cette commune (non couverte ou seuil de diffusion).";

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildLovacFields(
  lovacEntry: LovacCommuneCache[string] | undefined,
): Pick<
  SocialHousingSnapshot,
  | "lovacVintage"
  | "privateVacantDwellings"
  | "privateVacancyRatePercent"
  | "privateVacantStructural"
  | "lovacNote"
> {
  if (!lovacEntry) {
    return {
      lovacVintage: null,
      privateVacantDwellings: null,
      privateVacancyRatePercent: null,
      privateVacantStructural: null,
      lovacNote: isJsonCachePresent(LOVAC_CACHE_FILE)
        ? LOVAC_MISSING_NOTE
        : "Cache LOVAC absent. Exécutez « npm run ingest:lovac ».",
    };
  }

  if (
    lovacEntry.suppressed &&
    lovacEntry.privateVacantDwellings === null &&
    lovacEntry.privateVacancyRatePercent === null
  ) {
    return {
      lovacVintage: lovacEntry.vintage,
      privateVacantDwellings: null,
      privateVacancyRatePercent: null,
      privateVacantStructural: null,
      lovacNote: LOVAC_SUPPRESSED_NOTE,
    };
  }

  return {
    lovacVintage: lovacEntry.vintage,
    privateVacantDwellings: lovacEntry.privateVacantDwellings,
    privateVacancyRatePercent: lovacEntry.privateVacancyRatePercent,
    privateVacantStructural: lovacEntry.privateVacantStructural,
    lovacNote:
      "Parc privé vacant (LOVAC, sources fiscales) — distinct de la vacance générale RP ; surestimation possible vs recensement.",
  };
}

export function loadSocialHousingSnapshot(
  inseeCode: string,
): SocialHousingSnapshot {
  const cache = loadJsonCache<HousingCommuneCache>(HOUSING_CACHE_FILE);
  const lovacCache = loadJsonCache<LovacCommuneCache>(LOVAC_CACHE_FILE);
  const entry = cache?.[inseeCode];
  const lovacFields = buildLovacFields(lovacCache?.[inseeCode]);

  if (!entry) {
    return {
      year: RP_VINTAGE,
      totalUnits: null,
      occupiedUnits: null,
      vacantUnits: null,
      totalDwellings: null,
      rpVacantDwellings: null,
      rpVacancyRatePercent: null,
      socialHousingSharePercent: null,
      vacancyRatePercent: null,
      primaryResidences: null,
      ownerOccupiedPrimarySharePercent: null,
      secondaryResidenceSharePercent: null,
      ...lovacFields,
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
    rpVacantDwellings: entry.rpVacantDwellings ?? null,
    rpVacancyRatePercent: entry.rpVacancyRatePercent ?? null,
    socialHousingSharePercent,
    vacancyRatePercent,
    primaryResidences: entry.primaryResidences ?? null,
    ownerOccupiedPrimarySharePercent:
      entry.ownerOccupiedPrimarySharePercent ?? null,
    secondaryResidenceSharePercent: entry.secondaryResidenceSharePercent ?? null,
    ...lovacFields,
    available: true,
    note:
      `Parc locatif social (RPLS ${RPLS_VINTAGE}) et vacance générale du parc (RP logement ${RP_VINTAGE}) — périmètres distincts.` +
      (lovacFields.privateVacantDwellings !== null
        ? ` Vacance parc privé LOVAC ${lovacFields.lovacVintage ?? LOVAC_VINTAGE}.`
        : ""),
  };
}

export { createRplsSource, createRpHousingSource, createLovacSource };
