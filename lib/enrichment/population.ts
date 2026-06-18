import { createPopulationHistorySource } from "../sources";
import { loadJsonCache } from "./cache";
import type {
  PopulationCommuneCache,
  PopulationHistorySnapshot,
  PopulationYearCount,
} from "../types";

const POPULATION_CACHE_FILE = "population-by-commune.json";
const HISTORY_YEARS = [2010, 2015, 2020, 2021, 2022];

export function loadPopulationHistorySnapshot(
  inseeCode: string,
): PopulationHistorySnapshot {
  const cache = loadJsonCache<PopulationCommuneCache>(POPULATION_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      latestYear: null,
      latestPopulation: null,
      history: [],
      available: false,
      note:
        "Cache population absent. Exécutez « npm run ingest:population » pour activer l'évolution démographique.",
    };
  }

  const history: PopulationYearCount[] = HISTORY_YEARS.flatMap((year) => {
    const population = entry.history[String(year)];
    if (population === undefined) {
      return [];
    }

    return [{ year, population }];
  });

  const latestYear = history.at(-1)?.year ?? null;
  const latestPopulation = history.at(-1)?.population ?? null;

  return {
    latestYear,
    latestPopulation,
    history,
    available: history.length > 0,
    note: `Populations municipales INSEE (DS_POPULATIONS_HISTORIQUES). La population légale affichée en tête de fiche provient de l'API Géo.`,
  };
}

export { createPopulationHistorySource };
