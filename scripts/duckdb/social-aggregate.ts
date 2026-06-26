import type { DuckDBConnection } from "@duckdb/node-api";
import { FILOSOFI_VINTAGE, RP_VINTAGE } from "@/lib/sources";
import type { SociodemographicsCommuneCache } from "@/lib/types";
import { sqlReadSemicolonCsv } from "./read-csv-sql";

const AGE_COLUMNS: Record<string, string> = {
  P22_POP0014: "0-14",
  P22_POP1529: "15-29",
  P22_POP3044: "30-44",
  P22_POP4559: "45-59",
  P22_POP6074: "60-74",
  P22_POP7589: "75-89",
  P22_POP90P: "90+",
};

export interface SocialCsvPaths {
  populationCsvPath: string;
  employmentCsvPath: string;
  filosofiCsvPath: string;
}

function parseFrenchDecimal(value: unknown): number | null {
  const normalized = String(value ?? "").replace(",", ".").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function ensureEntry(
  cache: SociodemographicsCommuneCache,
  inseeCode: string,
): SociodemographicsCommuneCache[string] {
  cache[inseeCode] ??= {
    year: RP_VINTAGE,
    incomeYear: null,
    ageBands: {},
    unemploymentRate: null,
    medianDisposableIncome: null,
  };
  return cache[inseeCode]!;
}

async function ingestAgeBands(
  connection: DuckDBConnection,
  cache: SociodemographicsCommuneCache,
  populationCsvPath: string,
): Promise<void> {
  const csv = sqlReadSemicolonCsv(populationCsvPath);
  const selects = Object.entries(AGE_COLUMNS)
    .map(
      ([column, label]) =>
        `TRY_CAST("${column}" AS DOUBLE) AS age_${label.replace(/[^a-z0-9]+/gi, "_")}`,
    )
    .join(",\n      ");

  const reader = await connection.runAndReadAll(`
    SELECT
      CODGEO AS insee_code,
      ${selects}
    FROM ${csv}
    WHERE CODGEO IS NOT NULL AND CODGEO <> ''
  `);

  const labelKeys = Object.values(AGE_COLUMNS).map((label) =>
    `age_${label.replace(/[^a-z0-9]+/gi, "_")}`,
  );

  for (const row of reader.getRowObjectsJson()) {
    const inseeCode = String(row.insee_code);
    const entry = ensureEntry(cache, inseeCode);
    const ageBands: Record<string, number> = {};

    for (const [index, label] of Object.values(AGE_COLUMNS).entries()) {
      const parsed = parseFrenchDecimal(row[labelKeys[index]!]);
      if (parsed !== null) {
        ageBands[label] = parsed;
      }
    }

    entry.ageBands = ageBands;
    entry.year = RP_VINTAGE;
  }
}

async function ingestUnemployment(
  connection: DuckDBConnection,
  cache: SociodemographicsCommuneCache,
  employmentCsvPath: string,
): Promise<void> {
  const csv = sqlReadSemicolonCsv(employmentCsvPath);
  const reader = await connection.runAndReadAll(`
    SELECT
      CODGEO AS insee_code,
      TRY_CAST("P22_CHOM1564" AS DOUBLE) AS unemployed,
      TRY_CAST("P22_ACT1564" AS DOUBLE) AS active
    FROM ${csv}
    WHERE CODGEO IS NOT NULL AND CODGEO <> ''
  `);

  for (const row of reader.getRowObjectsJson()) {
    const inseeCode = String(row.insee_code);
    const unemployed = parseFrenchDecimal(row.unemployed);
    const active = parseFrenchDecimal(row.active);
    const unemploymentRate =
      unemployed !== null && active !== null && active > 0
        ? Math.round((unemployed / active) * 1000) / 10
        : null;

    const entry = ensureEntry(cache, inseeCode);
    entry.unemploymentRate = unemploymentRate;
  }
}

async function ingestFilosofi(
  connection: DuckDBConnection,
  cache: SociodemographicsCommuneCache,
  filosofiCsvPath: string,
): Promise<void> {
  const csv = sqlReadSemicolonCsv(filosofiCsvPath);
  const reader = await connection.runAndReadAll(`
    SELECT
      GEO AS insee_code,
      TRY_CAST(replace(OBS_VALUE, ',', '.') AS DOUBLE) AS median_income
    FROM ${csv}
    WHERE GEO_OBJECT = 'COM'
      AND FILOSOFI_MEASURE = 'MED_SL'
      AND CONF_STATUS = 'F'
      AND GEO IS NOT NULL
      AND GEO <> ''
  `);

  for (const row of reader.getRowObjectsJson()) {
    const inseeCode = String(row.insee_code);
    const medianIncome = parseFrenchDecimal(row.median_income);
    if (medianIncome === null) {
      continue;
    }

    const entry = ensureEntry(cache, inseeCode);
    entry.medianDisposableIncome = medianIncome;
    entry.incomeYear = FILOSOFI_VINTAGE;
  }
}

export async function aggregateSocialCommuneCache(
  connection: DuckDBConnection,
  paths: SocialCsvPaths,
): Promise<SociodemographicsCommuneCache> {
  const cache: SociodemographicsCommuneCache = {};

  await ingestAgeBands(connection, cache, paths.populationCsvPath);
  await ingestUnemployment(connection, cache, paths.employmentCsvPath);
  await ingestFilosofi(connection, cache, paths.filosofiCsvPath);

  return cache;
}
