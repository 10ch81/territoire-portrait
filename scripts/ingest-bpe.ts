import { createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { BPE_MMELODI_FILE_URL } from "../lib/sources";
import { extractZip } from "./ingest-utils";
import {
  aggregateBpeCommuneCache,
  exportBpeTypeLabels,
} from "./duckdb/bpe-aggregate";
import { withDuckDbSession } from "./duckdb/session";

const CACHE_DIR = resolve(process.cwd(), "data/cache");
const ZIP_PATH = resolve(CACHE_DIR, "bpe-2024.zip");
const EXTRACT_DIR = resolve(CACHE_DIR, "bpe-2024-extract");
const DATA_CSV_PATH = resolve(EXTRACT_DIR, "DS_BPE_2024_data.csv");
const METADATA_CSV_PATH = resolve(EXTRACT_DIR, "DS_BPE_2024_metadata.csv");
const OUTPUT_PATH = resolve(CACHE_DIR, "bpe-by-commune.json");
const LABELS_OUTPUT_PATH = resolve(CACHE_DIR, "bpe-type-labels.json");

async function downloadBpeArchive(): Promise<void> {
  console.log("Téléchargement BPE INSEE…");
  const response = await fetch(BPE_MMELODI_FILE_URL);

  if (!response.ok || !response.body) {
    throw new Error(`Téléchargement BPE impossible (statut ${response.status}).`);
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  const fileStream = createWriteStream(ZIP_PATH);
  await pipeline(Readable.fromWeb(response.body as never), fileStream);
  console.log(`Archive enregistrée : ${ZIP_PATH}`);
}

async function main(): Promise<void> {
  if (!existsSync(ZIP_PATH)) {
    await downloadBpeArchive();
  }

  if (!existsSync(DATA_CSV_PATH)) {
    extractZip(ZIP_PATH, EXTRACT_DIR);
  }

  console.log("Agrégation BPE via DuckDB (peut prendre ~30 s)…");

  const { cache, labels } = await withDuckDbSession(async (connection) => {
    const aggregatedCache = await aggregateBpeCommuneCache(connection, DATA_CSV_PATH);
    const typeLabels = await exportBpeTypeLabels(connection, METADATA_CSV_PATH);
    return { cache: aggregatedCache, labels: typeLabels };
  });

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  writeFileSync(LABELS_OUTPUT_PATH, JSON.stringify(labels));
  console.log(`\n✅ Cache BPE généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
  console.log(`✅ Libellés BPE générés : ${LABELS_OUTPUT_PATH}`);
  console.log(`   Types indexés : ${Object.keys(labels).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion BPE :", error);
  process.exit(1);
});
