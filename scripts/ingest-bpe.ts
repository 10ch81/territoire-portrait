import { createReadStream, createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { BPE_MMELODI_FILE_URL } from "../lib/sources";
import { extractZip } from "./ingest-utils";
import type { BpeCommuneCache, BpeCommuneCacheEntry } from "../lib/types";

const CACHE_DIR = resolve(process.cwd(), "data/cache");
const ZIP_PATH = resolve(CACHE_DIR, "bpe-2024.zip");
const EXTRACT_DIR = resolve(CACHE_DIR, "bpe-2024-extract");
const DATA_CSV_PATH = resolve(EXTRACT_DIR, "DS_BPE_2024_data.csv");
const METADATA_CSV_PATH = resolve(EXTRACT_DIR, "DS_BPE_2024_metadata.csv");
const OUTPUT_PATH = resolve(CACHE_DIR, "bpe-by-commune.json");
const LABELS_OUTPUT_PATH = resolve(CACHE_DIR, "bpe-type-labels.json");

const BPE_DOMAINS = new Set(["A", "B", "C", "D", "E", "F", "G"]);

function parseCsvLine(line: string): string[] {
  return line.split(";").map((cell) => cell.replace(/^"|"$/g, "").trim());
}

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

async function aggregateCommuneData(): Promise<BpeCommuneCache> {
  if (!existsSync(DATA_CSV_PATH)) {
    throw new Error(`Fichier BPE introuvable : ${DATA_CSV_PATH}`);
  }

  console.log("Agrégation par commune (peut prendre 1-2 min)…");

  const cache: BpeCommuneCache = {};
  const stream = createInterface({
    input: createReadStream(DATA_CSV_PATH, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  for await (const line of stream) {
    lineNumber += 1;
    if (lineNumber === 1 || !line.trim()) {
      continue;
    }

    const [geo, geoObject, facilityDom, , facilityType, , timePeriod, obsValueRaw] =
      parseCsvLine(line);

    if (geoObject !== "COM") {
      continue;
    }

    const count = Number.parseInt(obsValueRaw, 10);
    if (Number.isNaN(count)) {
      continue;
    }

    const year = Number.parseInt(timePeriod, 10) || 2024;
    const entry = cache[geo] ?? {
      year,
      total: 0,
      byDomain: {},
      byType: {},
    };

    if (facilityDom === "_T") {
      entry.total = count;
    } else if (BPE_DOMAINS.has(facilityDom)) {
      entry.byDomain[facilityDom] = count;
    }

    if (facilityType && facilityType !== "_T") {
      entry.byType[facilityType] = count;
    }

    cache[geo] = entry;
  }

  return cache;
}

async function exportBpeTypeLabels(): Promise<Record<string, string>> {
  if (!existsSync(METADATA_CSV_PATH)) {
    throw new Error(`Métadonnées BPE introuvables : ${METADATA_CSV_PATH}`);
  }

  const labels: Record<string, string> = {};
  const stream = createInterface({
    input: createReadStream(METADATA_CSV_PATH, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  for await (const line of stream) {
    lineNumber += 1;
    if (lineNumber === 1 || !line.trim()) {
      continue;
    }

    const [variable, , code, label] = parseCsvLine(line);
    if (variable === "FACILITY_TYPE" && code && label) {
      labels[code] = label;
    }
  }

  return labels;
}

async function main(): Promise<void> {
  if (!existsSync(ZIP_PATH)) {
    await downloadBpeArchive();
  }

  if (!existsSync(DATA_CSV_PATH)) {
    extractZip(ZIP_PATH, EXTRACT_DIR);
  }
  const cache = await aggregateCommuneData();
  const labels = await exportBpeTypeLabels();

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
