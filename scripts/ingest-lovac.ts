import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  createCsvReadStream,
  downloadFileUnderMaxBytes,
  parseCsvLine,
  stripCsvBom,
} from "./ingest-utils";
import { LOVAC_FILE_URL } from "../lib/sources";
import type { LovacCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "lovac-by-commune.json");
const CSV_PATH = resolve(CACHE_DIR, "lovac-opendata-communes.csv");

interface LovacColumnSet {
  inseeColumn: string;
  vacantColumn: string;
  structuralColumn: string;
  totalColumn: string;
  vacantYear: number;
}

function parseLovacNumeric(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === "s" || trimmed === "nd") {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSuppressed(raw: string): boolean {
  return raw.trim().toLowerCase() === "s";
}

function detectLatestColumns(headers: string[]): LovacColumnSet {
  const vacantYears = headers
    .map((name) => {
      const match = /^pp_vacant_(\d{2})$/.exec(name);
      return match ? Number.parseInt(match[1]!, 10) : null;
    })
    .filter((year): year is number => year !== null);

  if (vacantYears.length === 0) {
    throw new Error("Colonnes LOVAC pp_vacant_* introuvables.");
  }

  const vacantYear = Math.max(...vacantYears);
  const suffix = String(vacantYear).padStart(2, "0");
  const vacantColumn = `pp_vacant_${suffix}`;
  const structuralColumn = `pp_vacant_plus_2ans_${suffix}`;

  const totalYears = headers
    .map((name) => {
      const match = /^pp_total_(\d{2})$/.exec(name);
      return match ? Number.parseInt(match[1]!, 10) : null;
    })
    .filter((year): year is number => year !== null);

  const totalYear =
    totalYears.filter((year) => year <= vacantYear).sort((a, b) => b - a)[0] ??
    Math.max(...totalYears);
  const totalColumn = `pp_total_${String(totalYear).padStart(2, "0")}`;

  const inseeColumn =
    headers.find((name) => /^CODGEO_\d{2}$/.test(name)) ?? "CODGEO_25";

  return {
    inseeColumn,
    vacantColumn,
    structuralColumn,
    totalColumn,
    vacantYear: 2000 + vacantYear,
  };
}

async function aggregateLovac(): Promise<LovacCommuneCache> {
  console.log("Téléchargement LOVAC avec garde-fou 20 Mo…");
  await downloadFileUnderMaxBytes(LOVAC_FILE_URL, CSV_PATH);

  console.log("Agrégation LOVAC par commune…");

  const cache: LovacCommuneCache = {};
  const stream = createInterface({
    input: createCsvReadStream(CSV_PATH),
    crlfDelay: Infinity,
  });

  let columns: LovacColumnSet | null = null;
  let headerIndex: Map<string, number> | null = null;

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      const headers = parseCsvLine(stripCsvBom(line));
      headerIndex = new Map(headers.map((name, position) => [name, position]));
      columns = detectLatestColumns(headers);
      console.log(
        `Millésime LOVAC détecté : vacance ${columns.vacantYear}, colonnes ${columns.vacantColumn} / ${columns.totalColumn}`,
      );
      continue;
    }

    const cells = parseCsvLine(line);
    const get = (key: string): string => cells[headerIndex!.get(key) ?? -1] ?? "";

    const inseeCode = get(columns!.inseeColumn).padStart(5, "0");
    if (!/^\d{5}$/.test(inseeCode)) {
      continue;
    }

    const vacantRaw = get(columns!.vacantColumn);
    const structuralRaw = get(columns!.structuralColumn);
    const totalRaw = get(columns!.totalColumn);

    const privateVacantDwellings = parseLovacNumeric(vacantRaw);
    const privateVacantStructural = parseLovacNumeric(structuralRaw);
    const privateTotalDwellings = parseLovacNumeric(totalRaw);

    const suppressed =
      isSuppressed(vacantRaw) &&
      privateVacantDwellings === null &&
      privateVacantStructural === null;

    const privateVacancyRatePercent =
      privateVacantDwellings !== null &&
      privateTotalDwellings !== null &&
      privateTotalDwellings > 0
        ? Math.round((privateVacantDwellings / privateTotalDwellings) * 1000) / 10
        : null;

    cache[inseeCode] = {
      vintage: columns!.vacantYear,
      privateTotalDwellings,
      privateVacantDwellings,
      privateVacantStructural,
      privateVacancyRatePercent,
      suppressed,
    };
  }

  return cache;
}

async function main(): Promise<void> {
  const cache = await aggregateLovac();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache, null, 0));
  console.log(`Cache LOVAC écrit : ${OUTPUT_PATH} (${Object.keys(cache).length} communes).`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
