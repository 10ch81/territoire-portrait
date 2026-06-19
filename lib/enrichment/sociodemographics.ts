import {
  createFilosofiSource,
  createRpEmploymentSource,
  createRpPopulationSource,
  FILOSOFI_VINTAGE,
  RP_VINTAGE,
} from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type {
  AgeBandCount,
  SociodemographicsCommuneCache,
  SociodemographicsSnapshot,
} from "../types";

const SOCIAL_CACHE_FILE = "social-by-commune.json";

const AGE_BAND_LABELS: Record<string, string> = {
  "0-14": "0-14 ans",
  "15-29": "15-29 ans",
  "30-44": "30-44 ans",
  "45-59": "45-59 ans",
  "60-74": "60-74 ans",
  "75-89": "75-89 ans",
  "90+": "90 ans ou plus",
};

export function loadSociodemographicsSnapshot(
  inseeCode: string,
): SociodemographicsSnapshot {
  const cachePresent = isJsonCachePresent(SOCIAL_CACHE_FILE);
  const cache = loadJsonCache<SociodemographicsCommuneCache>(SOCIAL_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    const note =
      !cachePresent || cache === null
        ? "Cache socio-démographique absent. Exécutez « npm run ingest:social » pour activer structure par âge, chômage et revenus."
        : `Commune ${inseeCode} absente du cache socio-démographique.`;

    return {
      year: RP_VINTAGE,
      incomeYear: null,
      ageBands: [],
      unemploymentRate: null,
      medianDisposableIncome: null,
      available: false,
      note,
    };
  }

  const rawBands = Object.entries(entry.ageBands).map(([band, population]) => ({
    label: AGE_BAND_LABELS[band] ?? band,
    population: Math.round(population),
  }));

  const totalPopulation = rawBands.reduce((sum, band) => sum + band.population, 0);

  const ageBands: AgeBandCount[] = rawBands.map((band) => ({
    ...band,
    sharePercent:
      totalPopulation > 0
        ? Math.round((band.population / totalPopulation) * 1000) / 10
        : null,
  }));

  return {
    year: entry.year,
    incomeYear: entry.incomeYear,
    ageBands,
    unemploymentRate: entry.unemploymentRate,
    medianDisposableIncome: entry.medianDisposableIncome,
    available: ageBands.length > 0,
    note:
      `Recensement ${entry.year} (structure par âge, chômage) et FILOSOFI ${entry.incomeYear ?? FILOSOFI_VINTAGE} (niveau de vie médian).`,
  };
}

export {
  createFilosofiSource,
  createRpEmploymentSource,
  createRpPopulationSource,
};
