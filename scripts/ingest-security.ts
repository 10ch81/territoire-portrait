import { createGunzip } from "node:zlib";
import { createReadStream, existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { SECURITY_INDICATOR_DEFS } from "../lib/enrichment/security";
import {
  CACHE_DIR,
  downloadFile,
  parseCsvLine,
  parseFrenchDecimal,
} from "./ingest-utils";
import type {
  SecurityCommuneCache,
  SecurityDepartmentCache,
  SecurityIndicatorCacheEntry,
} from "../lib/types";

const COMMUNE_OUTPUT_PATH = resolve(CACHE_DIR, "security-by-commune.json");
const DEPARTMENT_OUTPUT_PATH = resolve(CACHE_DIR, "security-by-department.json");
const COMMUNE_GZ_PATH = resolve(CACHE_DIR, "ssmsi-commune.csv.gz");
const LATEST_YEAR = 2024;

const COMMUNE_URL =
  "https://static.data.gouv.fr/resources/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales/20260326-124144/donnee-data.gouv-2025-geographie2025-produit-le2026-02-03.csv.gz";
const DEPARTMENT_URL =
  "https://static.data.gouv.fr/resources/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales/20260129-160318/donnee-dep-data.gouv-2025-geographie2025-produit-le2026-01-22.csv";

const INDICATOR_ID_BY_LABEL = Object.fromEntries(
  SECURITY_INDICATOR_DEFS.map((indicator) => [indicator.label, indicator.id]),
) as Record<string, string>;

function parseOptionalCount(value: string): number | null {
  const normalized = value.trim();
  if (!normalized || normalized.toUpperCase() === "NA") {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalRate(value: string): number | null {
  const normalized = value.trim();
  if (!normalized || normalized.toUpperCase() === "NA") {
    return null;
  }

  return parseFrenchDecimal(normalized);
}

async function aggregateCommuneData(): Promise<SecurityCommuneCache> {
  if (!existsSync(COMMUNE_GZ_PATH)) {
    await downloadFile(COMMUNE_URL, COMMUNE_GZ_PATH);
  }

  console.log("Agrégation SSMSI par commune…");

  const cache: SecurityCommuneCache = {};
  const stream = createInterface({
    input: createReadStream(COMMUNE_GZ_PATH).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  for await (const line of stream) {
    lineNumber += 1;
    if (lineNumber === 1 || !line.trim()) {
      continue;
    }

    const [
      inseeCode,
      yearRaw,
      indicatorLabel,
      ,
      countRaw,
      rateRaw,
      diffusedRaw,
    ] = parseCsvLine(line);

    const year = Number.parseInt(yearRaw, 10);
    if (year !== LATEST_YEAR) {
      continue;
    }

    const indicatorId = INDICATOR_ID_BY_LABEL[indicatorLabel];
    if (!indicatorId) {
      continue;
    }

    const diffused = diffusedRaw === "diff";
    const indicator: SecurityIndicatorCacheEntry = {
      count: diffused ? parseOptionalCount(countRaw) : null,
      ratePer1000: diffused ? parseOptionalRate(rateRaw) : null,
      diffused,
    };

    const entry = cache[inseeCode] ?? {
      year,
      departmentCode: inseeCode.slice(0, 2),
      indicators: {},
    };

    entry.indicators[indicatorId] = indicator;
    cache[inseeCode] = entry;
  }

  return cache;
}

async function aggregateDepartmentData(): Promise<SecurityDepartmentCache> {
  console.log("Agrégation SSMSI par département…");

  const response = await fetch(DEPARTMENT_URL);
  if (!response.ok) {
    throw new Error(`Téléchargement SSMSI département impossible (${response.status}).`);
  }

  const text = await response.text();
  const cache: SecurityDepartmentCache = {};

  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) {
      continue;
    }

    const [departmentCode, , yearRaw, indicatorLabel, , countRaw, rateRaw] =
      parseCsvLine(line);

    const year = Number.parseInt(yearRaw, 10);
    if (year !== LATEST_YEAR) {
      continue;
    }

    const indicatorId = INDICATOR_ID_BY_LABEL[indicatorLabel];
    if (!indicatorId) {
      continue;
    }

    const entry = cache[departmentCode] ?? {
      year,
      indicators: {},
    };

    entry.indicators[indicatorId] = {
      count: parseOptionalCount(countRaw),
      ratePer1000: parseOptionalRate(rateRaw),
      diffused: true,
    };

    cache[departmentCode] = entry;
  }

  return cache;
}

async function main(): Promise<void> {
  const [communeCache, departmentCache] = await Promise.all([
    aggregateCommuneData(),
    aggregateDepartmentData(),
  ]);

  writeFileSync(COMMUNE_OUTPUT_PATH, JSON.stringify(communeCache));
  writeFileSync(DEPARTMENT_OUTPUT_PATH, JSON.stringify(departmentCache));

  console.log(
    `Cache SSMSI écrit : ${Object.keys(communeCache).length} communes, ${Object.keys(departmentCache).length} départements.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
