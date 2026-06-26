import type { DuckDBConnection } from "@duckdb/node-api";
import type { BpeCommuneCache } from "@/lib/types";
import { sqlReadSemicolonCsv } from "./read-csv-sql";

const BPE_DOMAINS = ["A", "B", "C", "D", "E", "F", "G"] as const;
const BPE_DOMAIN_LIST = BPE_DOMAINS.map((domain) => `'${domain}'`).join(", ");

const COM_FILTER =
  "GEO_OBJECT = 'COM' AND TRY_CAST(OBS_VALUE AS INTEGER) IS NOT NULL";

export async function aggregateBpeCommuneCache(
  connection: DuckDBConnection,
  dataCsvPath: string,
): Promise<BpeCommuneCache> {
  const csv = sqlReadSemicolonCsv(dataCsvPath);
  const cache: BpeCommuneCache = {};

  const totalsReader = await connection.runAndReadAll(`
    SELECT
      GEO AS geo,
      MAX(CAST(TIME_PERIOD AS INTEGER)) AS year,
      MAX(CASE WHEN FACILITY_DOM = '_T' THEN CAST(OBS_VALUE AS INTEGER) END) AS total
    FROM ${csv}
    WHERE ${COM_FILTER}
    GROUP BY GEO
  `);

  for (const row of totalsReader.getRowObjectsJson()) {
    const geo = String(row.geo);
    const year = Number(row.year) || 2024;
    const total = row.total === null ? 0 : Number(row.total);

    cache[geo] = {
      year,
      total,
      byDomain: {},
      byType: {},
    };
  }

  const domainsReader = await connection.runAndReadAll(`
    WITH numbered AS (
      SELECT *, row_number() OVER () AS file_ord
      FROM ${csv}
    ),
    ordered AS (
      SELECT
        GEO AS geo,
        FACILITY_DOM AS domain,
        CAST(OBS_VALUE AS INTEGER) AS count,
        file_ord
      FROM numbered
      WHERE ${COM_FILTER}
        AND FACILITY_DOM IN (${BPE_DOMAIN_LIST})
    )
    SELECT
      geo,
      domain,
      arg_max(count, file_ord) AS count
    FROM ordered
    GROUP BY geo, domain
  `);

  for (const row of domainsReader.getRowObjectsJson()) {
    const geo = String(row.geo);
    const entry = cache[geo];
    if (!entry) {
      continue;
    }
    entry.byDomain[String(row.domain)] = Number(row.count);
  }

  const typesReader = await connection.runAndReadAll(`
    SELECT
      GEO AS geo,
      FACILITY_TYPE AS facility_type,
      CAST(OBS_VALUE AS INTEGER) AS count
    FROM ${csv}
    WHERE ${COM_FILTER}
      AND FACILITY_TYPE IS NOT NULL
      AND FACILITY_TYPE <> '_T'
  `);

  for (const row of typesReader.getRowObjectsJson()) {
    const geo = String(row.geo);
    const entry = cache[geo];
    if (!entry) {
      continue;
    }
    entry.byType[String(row.facility_type)] = Number(row.count);
  }

  return cache;
}

export async function exportBpeTypeLabels(
  connection: DuckDBConnection,
  metadataCsvPath: string,
): Promise<Record<string, string>> {
  const csv = sqlReadSemicolonCsv(metadataCsvPath);
  const reader = await connection.runAndReadAll(`
    SELECT
      COD_MOD AS code,
      LIB_MOD AS label
    FROM ${csv}
    WHERE COD_VAR = 'FACILITY_TYPE'
      AND COD_MOD IS NOT NULL
      AND COD_MOD <> ''
      AND LIB_MOD IS NOT NULL
      AND LIB_MOD <> ''
  `);

  const labels: Record<string, string> = {};
  for (const row of reader.getRowObjectsJson()) {
    labels[String(row.code)] = String(row.label);
  }

  return labels;
}