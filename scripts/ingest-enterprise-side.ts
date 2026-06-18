import { createReadStream, existsSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  downloadFile,
  extractZip,
  parseCsvLine,
} from "./ingest-utils";
import type { EnterpriseSideCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "enterprise-side-by-commune.json");

const SOURCES = [
  {
    zipName: "side-stocks-ul-com.zip",
    extractDir: "side-stocks-ul-com-extract",
    url: "https://www.insee.fr/fr/statistiques/fichier/8379191/DS_SIDE_STOCKS_UL_COM.zip",
    measure: "LEGAL_UNIT",
    field: "legalUnits" as const,
  },
  {
    zipName: "side-stocks-et-com.zip",
    extractDir: "side-stocks-et-com-extract",
    url: "https://www.insee.fr/fr/statistiques/fichier/8379191/DS_SIDE_STOCKS_ET_COM.zip",
    measure: "UNIT_LOC",
    field: "establishments" as const,
  },
];

interface SideAggregate {
  legalUnitsYear: number;
  legalUnits: number;
  establishmentsYear: number;
  establishments: number;
}

function findDataCsv(directory: string): string {
  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find((name) => name.endsWith("_data.csv"));

  if (!match) {
    throw new Error(`CSV SIDE introuvable dans ${directory}.`);
  }

  return resolve(directory, match);
}

async function ingestSideFile(
  cache: Record<string, SideAggregate>,
  config: (typeof SOURCES)[number],
): Promise<void> {
  const zipPath = resolve(CACHE_DIR, config.zipName);
  const extractDir = resolve(CACHE_DIR, config.extractDir);

  if (!existsSync(zipPath)) {
    await downloadFile(config.url, zipPath);
  }
  extractZip(zipPath, extractDir);

  const csvPath = findDataCsv(extractDir);
  const stream = createInterface({
    input: createReadStream(csvPath, { encoding: "latin1" }),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      const headers = parseCsvLine(line);
      headerIndex = new Map(headers.map((name, position) => [name, position]));
      continue;
    }

    const cells = parseCsvLine(line);
    if ((cells[headerIndex.get("GEO_OBJECT") ?? -1] ?? "") !== "COM") {
      continue;
    }

    if ((cells[headerIndex.get("SIDE_MEASURE") ?? -1] ?? "") !== config.measure) {
      continue;
    }

    if ((cells[headerIndex.get("ACTIVITY") ?? -1] ?? "") !== "_T") {
      continue;
    }

    const inseeCode = cells[headerIndex.get("GEO") ?? -1] ?? "";
    if (!/^\d{5}$/.test(inseeCode)) {
      continue;
    }

    const year = Number.parseInt(cells[headerIndex.get("TIME_PERIOD") ?? -1] ?? "", 10);
    const value = Number.parseInt(cells[headerIndex.get("OBS_VALUE") ?? -1] ?? "", 10);
    if (!Number.isFinite(year) || !Number.isFinite(value)) {
      continue;
    }

    const entry = cache[inseeCode] ?? {
      legalUnitsYear: 0,
      legalUnits: 0,
      establishmentsYear: 0,
      establishments: 0,
    };

    const fieldYearKey =
      config.field === "legalUnits" ? "legalUnitsYear" : "establishmentsYear";
    const currentYear = entry[fieldYearKey];

    if (year > currentYear) {
      entry[fieldYearKey] = year;
      entry[config.field] = 0;
    } else if (year < currentYear) {
      continue;
    }

    entry[config.field] += value;
    cache[inseeCode] = entry;
  }
}

async function main(): Promise<void> {
  const aggregates: Record<string, SideAggregate> = {};

  for (const source of SOURCES) {
    console.log(`\n▶ SIDE ${source.measure}`);
    await ingestSideFile(aggregates, source);
  }

  const output: EnterpriseSideCommuneCache = {};
  for (const [inseeCode, aggregate] of Object.entries(aggregates)) {
    const year = Math.max(aggregate.legalUnitsYear, aggregate.establishmentsYear);
    output[inseeCode] = {
      year: year || aggregate.legalUnitsYear || aggregate.establishmentsYear,
      legalUnits: aggregate.legalUnits,
      establishments: aggregate.establishments,
    };
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  console.log(`\n✅ Cache SIDE généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(output).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion SIDE :", error);
  process.exit(1);
});
