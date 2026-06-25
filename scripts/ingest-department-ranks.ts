import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  fetchAllDepartmentCodes,
  fetchDepartmentCommunes,
  type GeoApiDepartmentCommune,
} from "../lib/geo/department-communes";
import {
  computeDepartmentRank,
  DEPARTMENT_RANK_INDICATOR_IDS,
  type DepartmentRankIndicatorId,
  type DepartmentRanksCommuneCache,
} from "../lib/indicators/department-ranks";
import { loadJsonCache } from "../lib/enrichment/cache";
import { CACHE_DIR } from "./ingest-utils";
import type {
  HousingCommuneCache,
  PropertyCommuneCache,
  SociodemographicsCommuneCache,
} from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "department-ranks-by-commune.json");

type RankExtractor = (input: {
  commune: GeoApiDepartmentCommune;
  social: SociodemographicsCommuneCache | null;
  housing: HousingCommuneCache | null;
  property: PropertyCommuneCache | null;
}) => number | null;

const RANK_CONFIG: Record<
  DepartmentRankIndicatorId,
  { descending: boolean; extract: RankExtractor }
> = {
  density: {
    descending: true,
    extract: ({ commune }) => {
      const population = commune.population ?? null;
      const surfaceHa = commune.surface ?? null;
      if (population === null || surfaceHa === null || surfaceHa <= 0) {
        return null;
      }
      return population / (surfaceHa / 100);
    },
  },
  unemployment_rate: {
    descending: false,
    extract: ({ commune, social }) => social?.[commune.code]?.unemploymentRate ?? null,
  },
  median_income: {
    descending: true,
    extract: ({ commune, social }) => social?.[commune.code]?.medianDisposableIncome ?? null,
  },
  owner_occupied_share: {
    descending: true,
    extract: ({ commune, housing }) =>
      housing?.[commune.code]?.ownerOccupiedPrimarySharePercent ?? null,
  },
  secondary_residence_share: {
    descending: true,
    extract: ({ commune, housing }) =>
      housing?.[commune.code]?.secondaryResidenceSharePercent ?? null,
  },
  price_per_m2: {
    descending: false,
    extract: ({ commune, property }) => property?.[commune.code]?.averagePricePerM2 ?? null,
  },
};

async function main(): Promise<void> {
  const social = loadJsonCache<SociodemographicsCommuneCache>("social-by-commune.json");
  const housing = loadJsonCache<HousingCommuneCache>("housing-by-commune.json");
  const property = loadJsonCache<PropertyCommuneCache>("property-by-commune.json");
  const cache: DepartmentRanksCommuneCache = {};

  const departmentCodes = await fetchAllDepartmentCodes();
  console.log(`Calcul des rangs départementaux pour ${departmentCodes.length} départements…`);

  for (const departmentCode of departmentCodes) {
    const communes = await fetchDepartmentCommunes(departmentCode, { includeSurface: true });
    if (communes.length === 0) {
      continue;
    }

    for (const indicatorId of DEPARTMENT_RANK_INDICATOR_IDS) {
      const config = RANK_CONFIG[indicatorId];
      const valuesByInsee = new Map<string, number>();

      for (const commune of communes) {
        const value = config.extract({ commune, social, housing, property });
        if (value !== null && Number.isFinite(value)) {
          valuesByInsee.set(commune.code, value);
        }
      }

      for (const commune of communes) {
        const rank = computeDepartmentRank(valuesByInsee, commune.code, config.descending);
        if (!rank) {
          continue;
        }
        cache[commune.code] ??= {};
        cache[commune.code]![indicatorId] = rank;
      }
    }

    process.stdout.write(".");
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache rangs départementaux : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion rangs départementaux :", error);
  process.exit(1);
});
