import type { DuckDBConnection } from "@duckdb/node-api";
import type { FloresCommuneCache, FloresSectorCacheEntry } from "@/lib/types";
import { sqlReadSemicolonCsv } from "./read-csv-sql";

const LEGAL_FORM_FILTER = "1T9X7";

const FLORES_FILTER = `
  GEO_OBJECT = 'COM'
  AND NUMBER_EMPL = '_T'
  AND LEGAL_FORM_WITH_PUBLIC = '${LEGAL_FORM_FILTER}'
  AND OBS_STATUS = 'A'
  AND regexp_matches(GEO, '^[0-9]{5}$')
`;

export async function aggregateFloresCommuneCache(
  connection: DuckDBConnection,
  dataCsvPath: string,
): Promise<FloresCommuneCache> {
  const csv = sqlReadSemicolonCsv(dataCsvPath);
  const cache: FloresCommuneCache = {};

  const reader = await connection.runAndReadAll(`
    WITH filtered AS (
      SELECT
        GEO AS geo,
        CAST(TIME_PERIOD AS INTEGER) AS year,
        ACTIVITY AS activity,
        FLORES_MEASURE AS measure,
        CAST(OBS_VALUE AS INTEGER) AS value
      FROM ${csv}
      WHERE ${FLORES_FILTER}
        AND TRY_CAST(OBS_VALUE AS INTEGER) IS NOT NULL
    ),
    latest AS (
      SELECT geo, MAX(year) AS year
      FROM filtered
      GROUP BY geo
    ),
    current AS (
      SELECT f.*
      FROM filtered f
      INNER JOIN latest l ON f.geo = l.geo AND f.year = l.year
    )
    SELECT geo, year, activity, measure, value
    FROM current
  `);

  for (const row of reader.getRowObjectsJson()) {
    const inseeCode = String(row.geo);
    const year = Number(row.year);
    const activity = String(row.activity);
    const measure = String(row.measure);
    const value = Number(row.value);

    const entry = cache[inseeCode] ?? {
      year,
      totalEstablishments: 0,
      totalSalariedPosts: 0,
      sectors: {},
    };

    if (year > entry.year) {
      entry.year = year;
      entry.totalEstablishments = 0;
      entry.totalSalariedPosts = 0;
      entry.sectors = {};
    } else if (year < entry.year) {
      continue;
    }

    if (activity === "_T") {
      if (measure === "UNIT_LOC") {
        entry.totalEstablishments = value;
      } else if (measure === "EMPL3112") {
        entry.totalSalariedPosts = value;
      }
      cache[inseeCode] = entry;
      continue;
    }

    const sector: FloresSectorCacheEntry = entry.sectors[activity] ?? {
      establishments: 0,
      salariedPosts: 0,
    };

    if (measure === "UNIT_LOC") {
      sector.establishments = value;
    } else if (measure === "EMPL3112") {
      sector.salariedPosts = value;
    }

    entry.sectors[activity] = sector;
    cache[inseeCode] = entry;
  }

  return cache;
}
