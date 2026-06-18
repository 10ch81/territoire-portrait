import { writeFileSync } from "node:fs";
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
import type { FiscalCommuneCache } from "../lib/types";

const ZIP_PATH = resolve(CACHE_DIR, "rei-2024.zip");
const EXTRACT_DIR = resolve(CACHE_DIR, "rei-2024-extract");
const OUTPUT_PATH = resolve(CACHE_DIR, "fiscal-by-commune.json");
const SOURCE_URL =
  "https://data.economie.gouv.fr/api/v2/catalog/datasets/impots-locaux-fichier-de-recensement-des-elements-dimposition-a-la-fiscalite-dir/attachments/rei_2024_fichier_notice_trace_zip";

function buildInseeCode(dep: string, com: string): string {
  return `${dep.padStart(2, "0")}${com.padStart(3, "0")}`.toUpperCase();
}

async function aggregateRei(): Promise<FiscalCommuneCache> {
  const csvPath = resolve(EXTRACT_DIR, "REI_2024.csv");

  const cache: FiscalCommuneCache = {};
  const stream = createInterface({
    input: createCsvReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  for await (const line of stream) {
    lineNumber += 1;
    if (lineNumber === 1 || !line.trim()) {
      continue;
    }

    const cells = parseCsvLine(line);
    const dep = cells[0];
    const com = cells[2];
    const b12Raw = cells[14];
    const b22Raw = cells[19];

    if (!dep || !com) {
      continue;
    }

    cache[buildInseeCode(dep, com)] = {
      year: 2024,
      propertyTaxBuiltRate: parseFrenchDecimal(b12Raw),
      propertyTaxUnbuiltRate: parseFrenchDecimal(b22Raw),
      habitationTaxRate: null,
    };
  }

  return cache;
}

async function main(): Promise<void> {
  const { existsSync } = await import("node:fs");

  if (!existsSync(ZIP_PATH)) {
    await downloadFile(SOURCE_URL, ZIP_PATH);
  }

  extractZip(ZIP_PATH, EXTRACT_DIR);
  const cache = await aggregateRei();

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache REI généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion REI :", error);
  process.exit(1);
});
