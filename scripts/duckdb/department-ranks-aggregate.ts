import type { DuckDBConnection } from "@duckdb/node-api";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  fetchAllDepartmentCodes,
  fetchDepartmentCommunes,
  type GeoApiDepartmentCommune,
} from "@/lib/geo/department-communes";
import {
  DEPARTMENT_RANK_INDICATOR_IDS,
  type DepartmentRankIndicatorId,
  type DepartmentRanksCommuneCache,
} from "@/lib/indicators/department-ranks";
import { loadJsonCache } from "@/lib/enrichment/cache";
import type {
  HousingCommuneCache,
  PropertyCommuneCache,
  SociodemographicsCommuneCache,
} from "@/lib/types";

interface RankInputRow {
  inseeCode: string;
  departmentCode: string;
  departmentCommuneCount: number;
  indicatorId: DepartmentRankIndicatorId;
  value: number;
  descending: boolean;
}

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

async function loadRankInputRows(): Promise<RankInputRow[]> {
  const social = loadJsonCache<SociodemographicsCommuneCache>("social-by-commune.json");
  const housing = loadJsonCache<HousingCommuneCache>("housing-by-commune.json");
  const property = loadJsonCache<PropertyCommuneCache>("property-by-commune.json");
  const rows: RankInputRow[] = [];

  const departmentCodes = await fetchAllDepartmentCodes();
  for (const departmentCode of departmentCodes) {
    const communes = await fetchDepartmentCommunes(departmentCode, { includeSurface: true });
    if (communes.length === 0) {
      continue;
    }

    for (const indicatorId of DEPARTMENT_RANK_INDICATOR_IDS) {
      const config = RANK_CONFIG[indicatorId];
      for (const commune of communes) {
        const value = config.extract({ commune, social, housing, property });
        if (value === null || !Number.isFinite(value)) {
          continue;
        }

        rows.push({
          inseeCode: commune.code,
          departmentCode,
          departmentCommuneCount: communes.length,
          indicatorId,
          value,
          descending: config.descending,
        });
      }
    }
  }

  return rows;
}

export async function aggregateDepartmentRanksCache(
  connection: DuckDBConnection,
): Promise<DepartmentRanksCommuneCache> {
  const rows = await loadRankInputRows();
  const tempPath = join(tmpdir(), `department-ranks-input-${Date.now()}.json`);
  writeFileSync(tempPath, JSON.stringify(rows));
  const escapedPath = tempPath.replace(/\\/g, "/").replace(/'/g, "''");

  await connection.run(`
    CREATE TABLE rank_input AS
    SELECT * FROM read_json('${escapedPath}')
  `);

  const reader = await connection.runAndReadAll(`
    SELECT
      inseeCode AS insee_code,
      departmentCode AS department_code,
      departmentCommuneCount AS department_commune_count,
      indicatorId AS indicator_id,
      CASE
        WHEN descending THEN
          RANK() OVER (
            PARTITION BY departmentCode, indicatorId
            ORDER BY value DESC
          )
        ELSE
          RANK() OVER (
            PARTITION BY departmentCode, indicatorId
            ORDER BY value ASC
          )
      END AS rank,
      COUNT(*) OVER (
        PARTITION BY departmentCode, indicatorId
      ) AS ranked_count
    FROM rank_input
  `);

  const cache: DepartmentRanksCommuneCache = {};
  for (const row of reader.getRowObjectsJson()) {
    const inseeCode = String(row.insee_code);
    const indicatorId = String(row.indicator_id) as DepartmentRankIndicatorId;
    const rankedCount = Number(row.ranked_count);
    if (rankedCount < 2) {
      continue;
    }

    cache[inseeCode] ??= {};
    cache[inseeCode]![indicatorId] = {
      rank: Number(row.rank),
      rankedCount,
      departmentCode: String(row.department_code),
      departmentCommuneCount: Number(row.department_commune_count),
    };
  }

  return cache;
}
