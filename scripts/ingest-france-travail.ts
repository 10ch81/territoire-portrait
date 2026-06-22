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
import { FRANCE_TRAVAIL_API_BASE } from "../lib/sources";
import type { FranceTravailCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "france-travail-by-commune.json");
const CSV_PATH = resolve(CACHE_DIR, "france-travail-communal.csv");

interface FranceTravailColumnSet {
  inseeColumn: string;
  ageColumn: string;
  countColumn: string;
}

async function detectLatestQuarter(): Promise<string> {
  const response = await fetch(
    `${FRANCE_TRAVAIL_API_BASE}/records?select=date&group_by=date&order_by=-date&limit=1`,
  );

  if (!response.ok) {
    throw new Error(
      `Impossible de détecter le trimestre France Travail (statut ${response.status}).`,
    );
  }

  const payload = (await response.json()) as {
    results: Array<{ date: string }>;
  };
  const quarter = payload.results[0]?.date;

  if (!quarter) {
    throw new Error("Trimestre France Travail introuvable.");
  }

  return quarter;
}

function detectColumns(headers: string[]): FranceTravailColumnSet {
  const inseeColumn =
    headers.find((name) => /^code commune$/i.test(name)) ?? "Code commune";
  const ageColumn =
    headers.find((name) => /^tranche d'âge$/i.test(name)) ??
    "Tranche d'âge";
  const countColumn =
    headers.find((name) => /^nombre de demandeurs d'emploi$/i.test(name)) ??
    "Nombre de demandeurs d'emploi";

  return { inseeColumn, ageColumn, countColumn };
}

function normalizeInseeCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (/^2[A-B]\d{3}$/.test(trimmed)) {
    return trimmed;
  }

  const numeric = trimmed.padStart(5, "0");
  if (/^\d{5}$/.test(numeric)) {
    return numeric;
  }

  return null;
}

function parseJobSeekerCount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function aggregateFranceTravail(): Promise<FranceTravailCommuneCache> {
  const quarter = await detectLatestQuarter();
  console.log(`Trimestre France Travail détecté : ${quarter}`);

  const where = encodeURIComponent(
    `date='${quarter}' AND sexe='Total' AND categorie='ABC'`,
  );
  const url = `${FRANCE_TRAVAIL_API_BASE}/exports/csv?use_labels=true&where=${where}`;

  await downloadFileUnderMaxBytes(url, CSV_PATH);

  const cache: FranceTravailCommuneCache = {};
  const stream = createInterface({
    input: createCsvReadStream(CSV_PATH),
    crlfDelay: Infinity,
  });

  let columns: FranceTravailColumnSet | null = null;
  let headerIndex: Map<string, number> | null = null;

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      const headers = parseCsvLine(stripCsvBom(line));
      headerIndex = new Map(headers.map((name, position) => [name, position]));
      columns = detectColumns(headers);
      continue;
    }

    const cells = parseCsvLine(line);
    const get = (key: string): string => cells[headerIndex!.get(key) ?? -1] ?? "";

    const inseeCode = normalizeInseeCode(get(columns!.inseeColumn));
    if (!inseeCode) {
      continue;
    }

    const ageBand = get(columns!.ageColumn).trim();
    const count = parseJobSeekerCount(get(columns!.countColumn));

    const entry = cache[inseeCode] ?? {
      quarter,
      totalJobSeekers: null,
      categoryA: null,
      under25: null,
      age50AndOver: null,
      longTerm: null,
    };

    if (ageBand === "Total") {
      entry.totalJobSeekers = count;
    } else if (ageBand === "Moins de 25 ans") {
      entry.under25 = count;
    } else if (ageBand === "50 ans et plus") {
      entry.age50AndOver = count;
    }

    cache[inseeCode] = entry;
  }

  return cache;
}

async function main(): Promise<void> {
  const cache = await aggregateFranceTravail();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache, null, 0));
  console.log(
    `Cache France Travail écrit : ${OUTPUT_PATH} (${Object.keys(cache).length} communes).`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
