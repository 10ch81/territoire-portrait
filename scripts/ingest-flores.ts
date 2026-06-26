import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  downloadFile,
  extractZip,
} from "./ingest-utils";
import { aggregateFloresCommuneCache } from "./duckdb/flores-aggregate";
import { withDuckDbSession } from "./duckdb/session";

const OUTPUT_PATH = resolve(CACHE_DIR, "flores-by-commune.json");
const ZIP_PATH = resolve(CACHE_DIR, "flores-a17.zip");
const EXTRACT_DIR = resolve(CACHE_DIR, "flores-a17-extract");
const FLORES_URL =
  "https://api.insee.fr/melodi/file/DS_FLORES_A17/DS_FLORES_A17_2024_CSV_FR";

function findDataCsv(directory: string): string {
  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find((name) => name.endsWith("_data.csv"));

  if (!match) {
    throw new Error(`CSV FLORES introuvable dans ${directory}.`);
  }

  return resolve(directory, match);
}

async function main(): Promise<void> {
  if (!existsSync(ZIP_PATH)) {
    await downloadFile(FLORES_URL, ZIP_PATH);
  }
  extractZip(ZIP_PATH, EXTRACT_DIR);

  const csvPath = findDataCsv(EXTRACT_DIR);
  console.log("Agrégation FLORES via DuckDB…");

  const cache = await withDuckDbSession((connection) =>
    aggregateFloresCommuneCache(connection, csvPath),
  );

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache FLORES généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion FLORES :", error);
  process.exit(1);
});
