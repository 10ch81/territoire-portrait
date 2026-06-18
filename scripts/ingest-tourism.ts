import { createReadStream, existsSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  downloadFile,
  extractZip,
  parseCsvLine,
} from "./ingest-utils";
import type { TourismCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "tourism-by-commune.json");
const ZIP = resolve(CACHE_DIR, "insee-tour-cap-2025.zip");
const EXTRACT_DIR = resolve(CACHE_DIR, "insee-tour-cap-2025-extract");
const URL =
  "https://www.insee.fr/fr/statistiques/fichier/2021703/DS_TOUR_CAP_CSV_2025_geo25.zip";

function findDataCsv(directory: string): string {
  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find((name) => name.endsWith("_data.csv"));

  if (!match) {
    throw new Error(`CSV tourisme introuvable dans ${directory}.`);
  }

  return resolve(directory, match);
}

async function main(): Promise<void> {
  if (!existsSync(ZIP)) {
    await downloadFile(URL, ZIP);
  }
  extractZip(ZIP, EXTRACT_DIR);

  const csvPath = findDataCsv(EXTRACT_DIR);
  const cache: TourismCommuneCache = {};
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

    if ((cells[headerIndex.get("TOUR_MEASURE") ?? -1] ?? "") !== "PLACE") {
      continue;
    }

    if ((cells[headerIndex.get("L_STAY") ?? -1] ?? "") !== "_T") {
      continue;
    }

    if ((cells[headerIndex.get("UNIT_LOC_RANKING") ?? -1] ?? "") !== "_T") {
      continue;
    }

    const inseeCode = cells[headerIndex.get("GEO") ?? -1] ?? "";
    if (!/^\d{5}$/.test(inseeCode)) {
      continue;
    }

    const year = Number.parseInt(cells[headerIndex.get("TIME_PERIOD") ?? -1] ?? "", 10);
    const places = Number.parseInt(cells[headerIndex.get("OBS_VALUE") ?? -1] ?? "", 10);
    if (!Number.isFinite(year) || !Number.isFinite(places)) {
      continue;
    }

    const entry = cache[inseeCode] ?? { year, accommodationPlaces: 0 };
    if (year > entry.year) {
      entry.year = year;
      entry.accommodationPlaces = 0;
    } else if (year < entry.year) {
      continue;
    }

    entry.accommodationPlaces += places;
    cache[inseeCode] = entry;
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache tourisme généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion tourisme :", error);
  process.exit(1);
});
