import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  createCsvReadStream,
  downloadFile,
  extractZip,
  parseCsvLine,
} from "./ingest-utils";
import type { FloresCommuneCache, FloresSectorCacheEntry } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "flores-by-commune.json");
const ZIP_PATH = resolve(CACHE_DIR, "flores-a17.zip");
const EXTRACT_DIR = resolve(CACHE_DIR, "flores-a17-extract");
const FLORES_URL =
  "https://api.insee.fr/melodi/file/DS_FLORES_A17/DS_FLORES_A17_2024_CSV_FR";

const LEGAL_FORM_FILTER = "1T9X7";

function findDataCsv(directory: string): string {
  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find((name) => name.endsWith("_data.csv"));

  if (!match) {
    throw new Error(`CSV FLORES introuvable dans ${directory}.`);
  }

  return resolve(directory, match);
}

function parseQuotedCsvLine(line: string): string[] {
  return parseCsvLine(line, ";").map((cell) => cell.replace(/^"|"$/g, "").trim());
}

async function aggregateFlores(): Promise<FloresCommuneCache> {
  if (!existsSync(ZIP_PATH)) {
    await downloadFile(FLORES_URL, ZIP_PATH);
  }
  extractZip(ZIP_PATH, EXTRACT_DIR);

  const csvPath = findDataCsv(EXTRACT_DIR);
  console.log("Agrégation FLORES A17 par commune…");

  const cache: FloresCommuneCache = {};
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
      const headers = parseQuotedCsvLine(line);
      headerIndex = new Map(headers.map((name, position) => [name, position]));
      continue;
    }

    const cells = parseQuotedCsvLine(line);
    const get = (key: string): string => cells[headerIndex!.get(key) ?? -1] ?? "";

    if (get("GEO_OBJECT") !== "COM") {
      continue;
    }
    if (get("NUMBER_EMPL") !== "_T") {
      continue;
    }
    if (get("LEGAL_FORM_WITH_PUBLIC") !== LEGAL_FORM_FILTER) {
      continue;
    }
    if (get("OBS_STATUS") !== "A") {
      continue;
    }

    const inseeCode = get("GEO");
    if (!/^\d{5}$/.test(inseeCode)) {
      continue;
    }

    const activity = get("ACTIVITY");
    const measure = get("FLORES_MEASURE");
    const year = Number.parseInt(get("TIME_PERIOD"), 10);
    const value = Number.parseInt(get("OBS_VALUE"), 10);
    if (!Number.isFinite(year) || !Number.isFinite(value)) {
      continue;
    }

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

async function main(): Promise<void> {
  const cache = await aggregateFlores();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache FLORES généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion FLORES :", error);
  process.exit(1);
});
