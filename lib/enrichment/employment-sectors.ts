import { createFloresSource } from "../sources";
import { getFloresA17Label } from "../flores-a17-labels";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type {
  EmploymentSectorCount,
  EmploymentSectorsSnapshot,
  FloresCommuneCache,
} from "../types";

const CACHE_FILE = "flores-by-commune.json";

function mapSectors(
  sectors: FloresCommuneCache[string]["sectors"],
): EmploymentSectorCount[] {
  return Object.entries(sectors)
    .map(([code, values]) => ({
      code,
      label: getFloresA17Label(code),
      establishments: values.establishments,
      salariedPosts: values.salariedPosts,
    }))
    .filter((sector) => sector.establishments > 0 || sector.salariedPosts > 0)
    .sort((a, b) => b.salariedPosts - a.salariedPosts);
}

export function loadEmploymentSectorsSnapshot(
  inseeCode: string,
): EmploymentSectorsSnapshot {
  if (!isJsonCachePresent(CACHE_FILE)) {
    return {
      year: 2024,
      totalEstablishments: 0,
      totalSalariedPosts: 0,
      sectors: [],
      available: false,
      note:
        "Cache FLORES absent. Exécutez « npm run ingest:flores » pour activer l'emploi salarié par secteur.",
    };
  }

  const cache = loadJsonCache<FloresCommuneCache>(CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2024,
      totalEstablishments: 0,
      totalSalariedPosts: 0,
      sectors: [],
      available: false,
      note: "Commune absente du cache FLORES (A17).",
    };
  }

  const sectors = mapSectors(entry.sectors);

  return {
    year: entry.year,
    totalEstablishments: entry.totalEstablishments,
    totalSalariedPosts: entry.totalSalariedPosts,
    sectors,
    available: entry.totalEstablishments > 0 || entry.totalSalariedPosts > 0,
    note:
      "FLORES INSEE — postes salariés fin d'année et établissements actifs par secteur A17. Les résultats FLORES ne doivent pas faire l'objet d'analyses comparatives dans le temps.",
  };
}

export { createFloresSource };
