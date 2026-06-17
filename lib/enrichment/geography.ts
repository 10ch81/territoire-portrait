import { createAavSource } from "../sources";
import { loadJsonCache } from "./cache";
import type {
  AttractionAreaSnapshot,
  EpciComparisonSnapshot,
  GeographySnapshot,
  TerritoryProfile,
} from "../types";

const GEOGRAPHY_CACHE_FILE = "geography-by-commune.json";

interface GeoApiEpciCommune {
  code: string;
  nom: string;
  population?: number;
  surface?: number;
}

async function fetchEpciComparison(
  territory: TerritoryProfile,
): Promise<EpciComparisonSnapshot | null> {
  if (!territory.epci) {
    return null;
  }

  const response = await fetch(
    `https://geo.api.gouv.fr/epcis/${encodeURIComponent(territory.epci.code)}/communes?fields=nom,code,population,surface&format=json`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    },
  );

  if (!response.ok) {
    console.error("Erreur API Géo EPCI:", response.status);
    return null;
  }

  const communes = (await response.json()) as GeoApiEpciCommune[];
  if (communes.length === 0) {
    return null;
  }

  const withMetrics = communes
    .map((commune) => {
      const population = commune.population ?? 0;
      const surfaceKm2 = commune.surface ? commune.surface / 100 : 0;
      const density =
        surfaceKm2 > 0 ? population / surfaceKm2 : Number.NEGATIVE_INFINITY;

      return {
        code: commune.code,
        population,
        density,
      };
    })
    .filter((commune) => commune.population > 0);

  const sortedByPopulation = [...withMetrics].sort(
    (a, b) => b.population - a.population,
  );
  const sortedByDensity = [...withMetrics].sort((a, b) => b.density - a.density);

  const populationRank =
    sortedByPopulation.findIndex((commune) => commune.code === territory.inseeCode) +
    1;
  const densityRank =
    sortedByDensity.findIndex((commune) => commune.code === territory.inseeCode) + 1;

  const averagePopulation =
    withMetrics.reduce((sum, commune) => sum + commune.population, 0) /
    withMetrics.length;
  const averageDensity =
    withMetrics.reduce((sum, commune) => sum + commune.density, 0) /
    withMetrics.length;

  return {
    epciName: territory.epci.name,
    communeCount: withMetrics.length,
    communeRankByPopulation: populationRank > 0 ? populationRank : null,
    communeRankByDensity: densityRank > 0 ? densityRank : null,
    epciAveragePopulation: Math.round(averagePopulation),
    epciAverageDensity: Math.round(averageDensity),
    available: true,
    note:
      "Comparatif calculé à partir des communes de l'EPCI (API Géo) — rangs par population et densité.",
  };
}

export async function loadGeographySnapshot(
  territory: TerritoryProfile,
): Promise<GeographySnapshot> {
  const cache = loadJsonCache<
    Record<
      string,
      {
        aavCode: string;
        categoryCode: string;
        categoryLabel: string;
      }
    >
  >(GEOGRAPHY_CACHE_FILE);

  const entry = cache?.[territory.inseeCode];
  const attractionArea: AttractionAreaSnapshot | null = entry
    ? {
        code: entry.aavCode,
        categoryCode: entry.categoryCode,
        categoryLabel: entry.categoryLabel,
        available: true,
        note: "Aire d'attraction des villes 2020 (AAV2020).",
      }
    : {
        code: "",
        categoryCode: "",
        categoryLabel: "",
        available: false,
        note:
          "Cache AAV absent. Exécutez « npm run ingest:geography » pour activer l'aire d'attraction.",
      };

  const epciComparison = await fetchEpciComparison(territory);

  return {
    attractionArea,
    epciComparison,
  };
}

export { createAavSource };
