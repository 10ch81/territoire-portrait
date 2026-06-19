import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  createCsvReadStream,
  downloadFile,
  extractZip,
  parseCsvLine,
  parseFrenchDecimal,
} from "./ingest-utils";
import {
  FILOSOFI_FILE_URL,
  FILOSOFI_VINTAGE,
  RP_EMPLOYMENT_FILE_URL,
  RP_POPULATION_FILE_URL,
  RP_VINTAGE,
} from "../lib/sources";
import type { SociodemographicsCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "social-by-commune.json");

const RP_POP_ZIP = resolve(CACHE_DIR, `rp-pop-${RP_VINTAGE}.zip`);
const RP_POP_DIR = resolve(CACHE_DIR, `rp-pop-${RP_VINTAGE}-extract`);
const RP_POP_URL = RP_POPULATION_FILE_URL;

const RP_EMPLOI_ZIP = resolve(CACHE_DIR, `rp-emploi-${RP_VINTAGE}.zip`);
const RP_EMPLOI_DIR = resolve(CACHE_DIR, `rp-emploi-${RP_VINTAGE}-extract`);
const RP_EMPLOI_URL = RP_EMPLOYMENT_FILE_URL;

const FILOSOFI_ZIP = resolve(CACHE_DIR, `filosofi-${FILOSOFI_VINTAGE}.zip`);
const FILOSOFI_DIR = resolve(CACHE_DIR, `filosofi-${FILOSOFI_VINTAGE}-extract`);
const FILOSOFI_URL = FILOSOFI_FILE_URL;

const AGE_COLUMNS: Record<string, string> = {
  P22_POP0014: "0-14",
  P22_POP1529: "15-29",
  P22_POP3044: "30-44",
  P22_POP4559: "45-59",
  P22_POP6074: "60-74",
  P22_POP7589: "75-89",
  P22_POP90P: "90+",
};

function findCsvFile(directory: string, prefix: string): string {
  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find(
      (name) =>
        name.toLowerCase().endsWith(".csv") &&
        name.toLowerCase().includes(prefix.toLowerCase()) &&
        !name.toLowerCase().includes("meta"),
    );

  if (!match) {
    throw new Error(`CSV introuvable dans ${directory} (${prefix}).`);
  }

  return resolve(directory, match);
}

function buildHeaderIndex(headerLine: string): Map<string, number> {
  const headers = parseCsvLine(headerLine);
  const index = new Map<string, number>();
  headers.forEach((name, position) => index.set(name, position));
  return index;
}

async function ingestAgeBands(
  cache: SociodemographicsCommuneCache,
): Promise<void> {
  if (!existsSync(RP_POP_ZIP)) {
    await downloadFile(RP_POP_URL, RP_POP_ZIP);
  }
  extractZip(RP_POP_ZIP, RP_POP_DIR);

  const csvPath = findCsvFile(RP_POP_DIR, `base-cc-evol-struct-pop-${RP_VINTAGE}`);
  const stream = createInterface({
    input: createCsvReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      headerIndex = buildHeaderIndex(line);
      continue;
    }

    const cells = parseCsvLine(line);
    const inseeCode = cells[0];
    if (!inseeCode) {
      continue;
    }

    const ageBands: Record<string, number> = {};
    for (const [column, label] of Object.entries(AGE_COLUMNS)) {
      const position = headerIndex.get(column);
      if (position === undefined) {
        continue;
      }
      const value = parseFrenchDecimal(cells[position] ?? "");
      if (value !== null) {
        ageBands[label] = value;
      }
    }

    cache[inseeCode] = {
      year: RP_VINTAGE,
      incomeYear: cache[inseeCode]?.incomeYear ?? null,
      ageBands,
      unemploymentRate: cache[inseeCode]?.unemploymentRate ?? null,
      medianDisposableIncome: cache[inseeCode]?.medianDisposableIncome ?? null,
    };
  }
}

async function ingestUnemployment(
  cache: SociodemographicsCommuneCache,
): Promise<void> {
  if (!existsSync(RP_EMPLOI_ZIP)) {
    await downloadFile(RP_EMPLOI_URL, RP_EMPLOI_ZIP);
  }
  extractZip(RP_EMPLOI_ZIP, RP_EMPLOI_DIR);

  const csvPath = findCsvFile(RP_EMPLOI_DIR, `base-cc-emploi-pop-active-${RP_VINTAGE}`);
  const stream = createInterface({
    input: createCsvReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;
  const unemployedColumn = "P22_CHOM1564";
  const activeColumn = "P22_ACT1564";

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      headerIndex = buildHeaderIndex(line);
      continue;
    }

    const cells = parseCsvLine(line);
    const inseeCode = cells[0];
    if (!inseeCode) {
      continue;
    }

    const unemployed = parseFrenchDecimal(
      cells[headerIndex.get(unemployedColumn) ?? -1] ?? "",
    );
    const active = parseFrenchDecimal(cells[headerIndex.get(activeColumn) ?? -1] ?? "");
    const unemploymentRate =
      unemployed !== null && active !== null && active > 0
        ? Math.round((unemployed / active) * 1000) / 10
        : null;

    const entry = cache[inseeCode] ?? {
      year: RP_VINTAGE,
      incomeYear: null,
      ageBands: {},
      unemploymentRate: null,
      medianDisposableIncome: null,
    };

    entry.unemploymentRate = unemploymentRate;
    cache[inseeCode] = entry;
  }
}

async function ingestFilosofi(cache: SociodemographicsCommuneCache): Promise<void> {
  if (!existsSync(FILOSOFI_ZIP)) {
    await downloadFile(FILOSOFI_URL, FILOSOFI_ZIP);
  }
  extractZip(FILOSOFI_ZIP, FILOSOFI_DIR);

  const csvPath = findCsvFile(FILOSOFI_DIR, `DS_FILOSOFI_CC_${FILOSOFI_VINTAGE}_data`);
  const stream = createInterface({
    input: createCsvReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;
  const measureColumn = "FILOSOFI_MEASURE";
  const geoColumn = "GEO";
  const geoObjectColumn = "GEO_OBJECT";
  const confStatusColumn = "CONF_STATUS";
  const valueColumn = "OBS_VALUE";
  const targetMeasure = "MED_SL";
  const targetGeoObject = "COM";
  const diffusableStatus = "F";

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      headerIndex = buildHeaderIndex(line);
      continue;
    }

    const cells = parseCsvLine(line);
    const measure = cells[headerIndex.get(measureColumn) ?? -1] ?? "";
    if (measure !== targetMeasure) {
      continue;
    }

    const geoObject = cells[headerIndex.get(geoObjectColumn) ?? -1] ?? "";
    if (geoObject !== targetGeoObject) {
      continue;
    }

    const confStatus = cells[headerIndex.get(confStatusColumn) ?? -1] ?? "";
    if (confStatus !== diffusableStatus) {
      continue;
    }

    const inseeCode = cells[headerIndex.get(geoColumn) ?? -1] ?? "";
    if (!inseeCode) {
      continue;
    }

    const medianIncome = parseFrenchDecimal(
      cells[headerIndex.get(valueColumn) ?? -1] ?? "",
    );
    if (medianIncome === null) {
      continue;
    }

    const entry = cache[inseeCode] ?? {
      year: RP_VINTAGE,
      incomeYear: null,
      ageBands: {},
      unemploymentRate: null,
      medianDisposableIncome: null,
    };

    entry.medianDisposableIncome = medianIncome;
    entry.incomeYear = FILOSOFI_VINTAGE;
    cache[inseeCode] = entry;
  }
}

async function main(): Promise<void> {
  const cache: SociodemographicsCommuneCache = {};

  console.log(`Ingestion structure par âge (RP ${RP_VINTAGE})…`);
  await ingestAgeBands(cache);

  console.log(`Ingestion chômage (RP ${RP_VINTAGE})…`);
  await ingestUnemployment(cache);

  console.log(`Ingestion revenus FILOSOFI ${FILOSOFI_VINTAGE}…`);
  await ingestFilosofi(cache);

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache socio-démographique généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion socio-démographique :", error);
  process.exit(1);
});
