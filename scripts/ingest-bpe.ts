import { createReadStream, createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { BPE_MMELODI_FILE_URL } from "../lib/sources";
import type { BpeCommuneCache, BpeCommuneCacheEntry } from "../lib/types";

const CACHE_DIR = resolve(process.cwd(), "data/cache");
const ZIP_PATH = resolve(CACHE_DIR, "bpe-2024.zip");
const EXTRACT_DIR = resolve(CACHE_DIR, "bpe-2024-extract");
const DATA_CSV_PATH = resolve(EXTRACT_DIR, "DS_BPE_2024_data.csv");
const OUTPUT_PATH = resolve(CACHE_DIR, "bpe-by-commune.json");

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

async function extractArchive(): Promise<void> {
  if (existsSync(DATA_CSV_PATH)) {
    return;
  }

  console.log("Extraction de l'archive ZIP…");
  mkdirSync(EXTRACT_DIR, { recursive: true });

  const result = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path '${ZIP_PATH.replace(/'/g, "''")}' -DestinationPath '${EXTRACT_DIR.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    throw new Error("Extraction ZIP échouée.");
  }
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

    const [geo, geoObject, facilityDom, , , , timePeriod, obsValueRaw] =
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
    };

    if (facilityDom === "_T") {
      entry.total = count;
    } else if (BPE_DOMAINS.has(facilityDom)) {
      entry.byDomain[facilityDom] = count;
    }

    cache[geo] = entry;
  }

  return cache;
}

async function main(): Promise<void> {
  if (!existsSync(ZIP_PATH)) {
    await downloadBpeArchive();
  }

  await extractArchive();
  const cache = await aggregateCommuneData();

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache BPE généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion BPE :", error);
  process.exit(1);
});
