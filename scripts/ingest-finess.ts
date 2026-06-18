import { existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { CACHE_DIR, createCsvReadStream, downloadFile, stripCsvBom } from "./ingest-utils";
import type { FinessCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "finess-by-commune.json");
const CSV_PATH = resolve(CACHE_DIR, "finess-etablissements.csv");
const FINESS_URL =
  "https://object.files.data.gouv.fr/data-pipeline-open/finess/finess_etablissements.csv";
const FINESS_YEAR = 2026;

function parseSemicolonCsvLine(line: string): string[] {
  return line.split(";").map((cell) => cell.replace(/^"|"$/g, "").trim());
}

function finessInseeCode(departement: string, commune: string): string | null {
  const dep = departement.trim();
  const com = commune.trim();
  if (!dep || !com) {
    return null;
  }

  if (/^\d{5}$/.test(com)) {
    return com.padStart(5, "0");
  }

  if (dep.length === 3) {
    const code = `${dep}${com.padStart(2, "0")}`;
    return /^\d{5}$/.test(code) ? code : null;
  }

  if (dep === "2A" || dep === "2B") {
    const code = `${dep}${com.padStart(3, "0")}`;
    return code.length === 5 ? code : null;
  }

  const code = `${dep.padStart(2, "0")}${com.padStart(3, "0")}`;
  return /^\d{5}$/.test(code) || /^2[AB]\d{3}$/.test(code) ? code : null;
}

function incrementBucket(
  bucket: Record<string, number>,
  key: string,
  labelFallback: string,
): void {
  const normalized = key.trim() || labelFallback;
  bucket[normalized] = (bucket[normalized] ?? 0) + 1;
}

async function aggregateFiness(): Promise<FinessCommuneCache> {
  if (!existsSync(CSV_PATH)) {
    await downloadFile(FINESS_URL, CSV_PATH);
  }

  console.log("Agrégation FINESS par commune…");

  const cache: FinessCommuneCache = {};
  const stream = createInterface({
    input: createCsvReadStream(CSV_PATH),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      const headers = parseSemicolonCsvLine(stripCsvBom(line));
      headerIndex = new Map(headers.map((name, position) => [name, position]));
      continue;
    }

    const cells = parseSemicolonCsvLine(line);
    const get = (key: string): string => cells[headerIndex!.get(key) ?? -1] ?? "";

    const inseeCode = finessInseeCode(get("departement"), get("commune"));
    if (!inseeCode) {
      continue;
    }

    const entry = cache[inseeCode] ?? {
      year: FINESS_YEAR,
      total: 0,
      totalCapacity: null,
      byCategory: {},
      byType: {},
    };

    entry.total += 1;
    incrementBucket(entry.byCategory, get("libcategetab"), "Catégorie non renseignée");
    incrementBucket(entry.byType, get("libcategagretab"), "Type non renseigné");
    cache[inseeCode] = entry;
  }

  return cache;
}

async function main(): Promise<void> {
  const cache = await aggregateFiness();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache FINESS généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion FINESS :", error);
  process.exit(1);
});
