import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  downloadFile,
  extractZip,
  parseCsvLine,
  parseFrenchDecimal,
} from "./ingest-utils";
import type { PopulationCommuneCache } from "../lib/types";

const ZIP_PATH = resolve(CACHE_DIR, "populations-historiques.zip");
const EXTRACT_DIR = resolve(CACHE_DIR, "populations-historiques-extract");
const OUTPUT_PATH = resolve(CACHE_DIR, "population-by-commune.json");
const SOURCE_URL =
  "https://api.insee.fr/melodi/file/DS_POPULATIONS_HISTORIQUES/DS_POPULATIONS_HISTORIQUES_CSV_FR";
const TARGET_YEARS = new Set([2010, 2015, 2020, 2021, 2022]);

async function aggregatePopulation(): Promise<PopulationCommuneCache> {
  const { existsSync, readdirSync } = await import("node:fs");
  const csvName = readdirSync(EXTRACT_DIR).find((name) => name.endsWith(".csv"));

  if (!csvName) {
    throw new Error("CSV population introuvable.");
  }

  const cache: PopulationCommuneCache = {};
  const stream = createInterface({
    input: createReadStream(resolve(EXTRACT_DIR, csvName), { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  for await (const line of stream) {
    lineNumber += 1;
    if (lineNumber === 1 || !line.trim()) {
      continue;
    }

    const [, geo, geoObject, measure, timePeriodRaw, obsValueRaw] = parseCsvLine(line);

    if (geoObject !== "COM" || measure !== "PMUN") {
      continue;
    }

    const year = Number.parseInt(timePeriodRaw, 10);
    if (!TARGET_YEARS.has(year)) {
      continue;
    }

    const population = Number.parseInt(obsValueRaw, 10);
    if (Number.isNaN(population)) {
      continue;
    }

    const entry = cache[geo] ?? { history: {} };
    entry.history[String(year)] = population;
    cache[geo] = entry;
  }

  return cache;
}

async function main(): Promise<void> {
  const { existsSync } = await import("node:fs");

  if (!existsSync(ZIP_PATH)) {
    await downloadFile(SOURCE_URL, ZIP_PATH);
  }

  extractZip(ZIP_PATH, EXTRACT_DIR);
  const cache = await aggregatePopulation();

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache population généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion population :", error);
  process.exit(1);
});
