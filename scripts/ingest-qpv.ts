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
import type { QpvCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "qpv-by-commune.json");
const ZIP = resolve(CACHE_DIR, "qpv-tag-2025.zip");
const EXTRACT_DIR = resolve(CACHE_DIR, "qpv-tag-2025-extract");
const URL =
  "https://www.insee.fr/fr/statistiques/fichier/8186239/TAG_QPV2024_2025_csv.zip";

function findCsvFile(directory: string): string {
  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find((name) => name.toLowerCase().endsWith(".csv"));

  if (!match) {
    throw new Error(`CSV QPV introuvable dans ${directory}.`);
  }

  return resolve(directory, match);
}

async function main(): Promise<void> {
  if (!existsSync(ZIP)) {
    await downloadFile(URL, ZIP);
  }
  extractZip(ZIP, EXTRACT_DIR);

  const csvPath = findCsvFile(EXTRACT_DIR);
  const stream = createInterface({
    input: createCsvReadStream(csvPath),
    crlfDelay: Infinity,
  });

  const cache: QpvCommuneCache = {};
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
    const label = cells[headerIndex.get("LIB_QP") ?? -1] ?? "";
    const inseeCode = cells[headerIndex.get("LIST_COM_2025") ?? -1] ?? "";

    if (!inseeCode || !/^\d{5}$/.test(inseeCode) || !label) {
      continue;
    }

    const entry = cache[inseeCode] ?? { year: 2025, qpvLabels: [] };
    if (!entry.qpvLabels.includes(label)) {
      entry.qpvLabels.push(label);
    }
    cache[inseeCode] = entry;
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache QPV généré : ${OUTPUT_PATH}`);
  console.log(`   Communes avec QPV : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion QPV :", error);
  process.exit(1);
});
