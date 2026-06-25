import {
  loadTypologyCacheEntry,
  mapAavSnapshot,
  mapCacheToDensityGrid,
  mapCacheToUrbanUnit,
  mapGeographyEntryToAav,
} from "@/lib/enrichment/typology-loaders";
import { loadJsonCache } from "@/lib/enrichment/cache";
import { deriveComparisonProfile } from "@/lib/typology/comparison-profile";
import { formatComparisonProfile } from "@/lib/ux/typology-display";
import type { ComparisonProfile } from "@/lib/typology/types";
import type { GeographyCommuneCache, TerritoryProfile } from "@/lib/types";
import { MAX_COMPARE_COMMUNES } from "./parse-codes";

const GEO_API_BASE = "https://geo.api.gouv.fr";
const GEOGRAPHY_CACHE_FILE = "geography-by-commune.json";
export const POPULATION_TOLERANCE_RATIO = 0.3;
/** La commune courante occupe une place dans le comparateur (max 5 communes). */
export const MAX_COMPARABLE_SUGGESTIONS = MAX_COMPARE_COMMUNES - 1;

interface GeoApiDepartmentCommune {
  nom: string;
  code: string;
  population?: number;
}

export interface ComparableCommuneSuggestion {
  inseeCode: string;
  name: string;
  population: number | null;
  profileLabel: string;
  populationDeltaPercent: number | null;
}

export interface ComparableCommunesResult {
  suggestions: ComparableCommuneSuggestion[];
  criteriaLabel: string;
  available: boolean;
  note: string | null;
}

function deriveProfileForCommune(input: {
  inseeCode: string;
  population: number | null;
  geographyCache: GeographyCommuneCache | null;
}): ComparisonProfile {
  const entry = loadTypologyCacheEntry(input.inseeCode);
  const densityGrid = mapCacheToDensityGrid(entry);
  const urbanUnit = mapCacheToUrbanUnit(entry);
  const geoEntry = input.geographyCache?.[input.inseeCode];
  const mappedAav = mapGeographyEntryToAav(geoEntry);
  const attractionArea = mappedAav
    ? mapAavSnapshot({
        code: mappedAav.areaCode,
        label: mappedAav.areaLabel,
        categoryCode: mappedAav.categoryCode,
        categoryLabel: mappedAav.categoryLabel,
        available: true,
        note: "AAV2020",
      })
    : mapAavSnapshot(null);

  return deriveComparisonProfile({
    population: input.population,
    densityGrid,
    attractionArea,
    urbanUnit,
  });
}

function populationWithinTolerance(
  reference: number,
  candidate: number,
  toleranceRatio: number,
): boolean {
  const min = reference * (1 - toleranceRatio);
  const max = reference * (1 + toleranceRatio);
  return candidate >= min && candidate <= max;
}

async function fetchDepartmentCommunes(
  departmentCode: string,
): Promise<GeoApiDepartmentCommune[]> {
  try {
    const response = await fetch(
      `${GEO_API_BASE}/departements/${encodeURIComponent(departmentCode)}/communes?fields=nom,code,population&format=json`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      },
    );

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as GeoApiDepartmentCommune[];
  } catch (error) {
    console.error("Erreur API Géo département (communes comparables):", error);
    return [];
  }
}

export async function findComparableCommunes(
  territory: TerritoryProfile,
): Promise<ComparableCommunesResult> {
  const departmentCode = territory.department?.code;
  const referencePopulation = territory.population;
  const referenceProfile =
    territory.enrichment?.territoryTypology?.comparisonProfile ??
    deriveProfileForCommune({
      inseeCode: territory.inseeCode,
      population: referencePopulation,
      geographyCache: loadJsonCache<GeographyCommuneCache>(GEOGRAPHY_CACHE_FILE),
    });

  if (!departmentCode || referenceProfile === "unknown") {
    return {
      suggestions: [],
      criteriaLabel: "Communes comparables",
      available: false,
      note: "Profil territorial ou département indisponible pour proposer des communes similaires.",
    };
  }

  const geographyCache = loadJsonCache<GeographyCommuneCache>(GEOGRAPHY_CACHE_FILE);
  const departmentCommunes = await fetchDepartmentCommunes(departmentCode);
  if (departmentCommunes.length === 0) {
    return {
      suggestions: [],
      criteriaLabel: `Même profil (${formatComparisonProfile(referenceProfile)}) · même département`,
      available: false,
      note: "Impossible de charger les communes du département pour proposer des comparables.",
    };
  }

  const profileLabel = formatComparisonProfile(referenceProfile);

  const candidates: ComparableCommuneSuggestion[] = [];

  for (const commune of departmentCommunes) {
    if (commune.code === territory.inseeCode) {
      continue;
    }

    const population = commune.population ?? null;
    if (referencePopulation !== null && population === null) {
      continue;
    }
    if (
      referencePopulation !== null &&
      population !== null &&
      !populationWithinTolerance(
        referencePopulation,
        population,
        POPULATION_TOLERANCE_RATIO,
      )
    ) {
      continue;
    }

    const profile = deriveProfileForCommune({
      inseeCode: commune.code,
      population,
      geographyCache,
    });

    if (profile !== referenceProfile) {
      continue;
    }

    const populationDeltaPercent =
      referencePopulation !== null &&
      referencePopulation > 0 &&
      population !== null
        ? Math.round(
            ((population - referencePopulation) / referencePopulation) * 1000,
          ) / 10
        : null;

    candidates.push({
      inseeCode: commune.code,
      name: commune.nom,
      population,
      profileLabel,
      populationDeltaPercent,
    });
  }

  candidates.sort((a, b) => {
    const deltaA = Math.abs(a.populationDeltaPercent ?? Number.POSITIVE_INFINITY);
    const deltaB = Math.abs(b.populationDeltaPercent ?? Number.POSITIVE_INFINITY);
    return deltaA - deltaB;
  });

  const suggestions = candidates.slice(0, MAX_COMPARABLE_SUGGESTIONS);
  const populationHint =
    referencePopulation !== null
      ? ` · population ±${Math.round(POPULATION_TOLERANCE_RATIO * 100)} %`
      : "";

  return {
    suggestions,
    criteriaLabel: `Même profil (${profileLabel}) · même département${populationHint}`,
    available: suggestions.length > 0,
    note:
      suggestions.length === 0
        ? "Aucune commune comparable trouvée avec ces critères dans le département."
        : null,
  };
}
