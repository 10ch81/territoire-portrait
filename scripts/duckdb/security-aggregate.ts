import type { DuckDBConnection } from "@duckdb/node-api";
import { SECURITY_INDICATOR_DEFS } from "@/lib/enrichment/security";
import type {
  SecurityCommuneCache,
  SecurityDepartmentCache,
  SecurityIndicatorCacheEntry,
} from "@/lib/types";
import { normalizeCsvPath, sqlReadGzSemicolonCsv } from "./read-csv-sql";

const LATEST_YEAR = 2024;

const INDICATOR_ID_BY_LABEL = Object.fromEntries(
  SECURITY_INDICATOR_DEFS.map((indicator) => [indicator.label, indicator.id]),
) as Record<string, string>;

function parseOptionalCount(value: unknown): number | null {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.toUpperCase() === "NA") {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalRate(value: unknown): number | null {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.toUpperCase() === "NA") {
    return null;
  }

  const parsed = Number.parseFloat(normalized.replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

function toIndicatorEntry(input: {
  countRaw: unknown;
  rateRaw: unknown;
  diffusedRaw: unknown;
  forceDiffused?: boolean;
}): SecurityIndicatorCacheEntry {
  const diffused = input.forceDiffused === true || String(input.diffusedRaw) === "diff";
  return {
    count: diffused ? parseOptionalCount(input.countRaw) : null,
    ratePer1000: diffused ? parseOptionalRate(input.rateRaw) : null,
    diffused,
  };
}

export async function aggregateSecurityCommuneCache(
  connection: DuckDBConnection,
  communeGzPath: string,
): Promise<SecurityCommuneCache> {
  const csv = sqlReadGzSemicolonCsv(communeGzPath);
  const cache: SecurityCommuneCache = {};

  const reader = await connection.runAndReadAll(`
    SELECT
      CODGEO_2025 AS insee_code,
      CAST(annee AS INTEGER) AS year,
      indicateur AS indicator_label,
      nombre AS count_raw,
      taux_pour_mille AS rate_raw,
      est_diffuse AS diffused_raw
    FROM ${csv}
    WHERE TRY_CAST(annee AS INTEGER) = ${LATEST_YEAR}
  `);

  for (const row of reader.getRowObjectsJson()) {
    const inseeCode = String(row.insee_code);
    const indicatorLabel = String(row.indicator_label);
    const indicatorId = INDICATOR_ID_BY_LABEL[indicatorLabel];
    if (!indicatorId) {
      continue;
    }

    const entry = cache[inseeCode] ?? {
      year: LATEST_YEAR,
      departmentCode: inseeCode.slice(0, 2),
      indicators: {},
    };

    entry.indicators[indicatorId] = toIndicatorEntry({
      countRaw: row.count_raw,
      rateRaw: row.rate_raw,
      diffusedRaw: row.diffused_raw,
    });
    cache[inseeCode] = entry;
  }

  return cache;
}

export async function aggregateSecurityDepartmentCache(
  connection: DuckDBConnection,
  departmentCsvPath: string,
): Promise<SecurityDepartmentCache> {
  const path = normalizeCsvPath(departmentCsvPath).replace(/'/g, "''");
  const cache: SecurityDepartmentCache = {};

  const reader = await connection.runAndReadAll(`
    SELECT
      column0 AS department_code,
      CAST(column2 AS INTEGER) AS year,
      column3 AS indicator_label,
      column5 AS count_raw,
      column6 AS rate_raw
    FROM read_csv('${path}', delim=';', quote='"', header=false, auto_detect=true, parallel=false)
    WHERE TRY_CAST(column2 AS INTEGER) = ${LATEST_YEAR}
  `);

  for (const row of reader.getRowObjectsJson()) {
    const departmentCode = String(row.department_code);
    const indicatorLabel = String(row.indicator_label);
    const indicatorId = INDICATOR_ID_BY_LABEL[indicatorLabel];
    if (!indicatorId) {
      continue;
    }

    const entry = cache[departmentCode] ?? {
      year: LATEST_YEAR,
      indicators: {},
    };

    entry.indicators[indicatorId] = toIndicatorEntry({
      countRaw: row.count_raw,
      rateRaw: row.rate_raw,
      diffusedRaw: "diff",
      forceDiffused: true,
    });
    cache[departmentCode] = entry;
  }

  return cache;
}
