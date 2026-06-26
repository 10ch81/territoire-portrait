import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  assertDownloadUnderMaxBytes,
  assertFileUnderMaxBytes,
  createCsvReadStream,
  downloadFile,
  parseCsvLine,
  stripCsvBom,
} from "./ingest-utils";
import {
  OT_CENTRALITY_ACCESS_MINUTES_URL,
  OT_HEALTH_DISTANT_SHARE_URL,
} from "../lib/sources";
import type { ObservatoireAccessCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "observatoire-access-by-commune.json");
const HEALTH_CSV_PATH = resolve(CACHE_DIR, "ot-health-distant-share.csv");
const CENTRALITY_CSV_PATH = resolve(CACHE_DIR, "ot-centrality-access-minutes.csv");

function normalizeInseeCode(raw: string): string | null {
  const trimmed = raw.trim().replace(/^"|"$/g, "").toUpperCase();
  if (/^2[A-B]\d{3}$/.test(trimmed)) {
    return trimmed;
  }

  const numeric = trimmed.padStart(5, "0");
  if (/^\d{5}$/.test(numeric)) {
    return numeric;
  }

  return null;
}

function parsePercent(raw: string): number | null {
  const trimmed = raw.trim().replace(/^"|"$/g, "").replace(",", ".").replace("%", "");
  if (!trimmed || trimmed.toLowerCase() === "s" || trimmed.toLowerCase() === "nd") {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed;
}

function parseMinutes(raw: string): number | null {
  const trimmed = raw.trim().replace(/^"|"$/g, "").replace(",", ".");
  if (!trimmed || trimmed.toLowerCase() === "s" || trimmed.toLowerCase() === "nd") {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 10) / 10;
}

function parseYear(raw: string): number | null {
  const trimmed = raw.trim().replace(/^"|"$/g, "");
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isGeoclipErrorPayload(filePath: string): boolean {
  const head = readFileSync(filePath, { encoding: "utf8", flag: "r" }).slice(0, 200);
  return head.includes("<!DOCTYPE") || head.includes("500 - Internal Server Error");
}

function ensureEntry(
  cache: ObservatoireAccessCommuneCache,
  inseeCode: string,
): ObservatoireAccessCommuneCache[string] {
  if (!cache[inseeCode]) {
    cache[inseeCode] = {
      healthDistantSharePercent: null,
      healthVintage: null,
      centralityAccessMinutes: null,
      centralityVintage: null,
    };
  }

  return cache[inseeCode];
}

async function ingestCsv(params: {
  url: string;
  destination: string;
  label: string;
  cache: ObservatoireAccessCommuneCache;
  parseValue: (raw: string) => number | null;
  apply: (
    entry: ObservatoireAccessCommuneCache[string],
    year: number | null,
    value: number | null,
  ) => void;
}): Promise<number> {
  await assertDownloadUnderMaxBytes(params.url);
  await downloadFile(params.url, params.destination);
  await assertFileUnderMaxBytes(params.destination);

  if (isGeoclipErrorPayload(params.destination)) {
    throw new Error(
      `Export Géoclip indisponible pour ${params.label} (réponse HTML d'erreur).`,
    );
  }

  const stream = createCsvReadStream(params.destination);
  const reader = createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] | null = null;
  let valueColumnIndex = -1;
  let processed = 0;

  for await (const line of reader) {
    const cells = parseCsvLine(stripCsvBom(line));

    if (!headers) {
      headers = cells;
      valueColumnIndex = headers.findIndex((name, index) => {
        const normalized = name.trim().toLowerCase();
        return index > 0 && normalized !== "codgeo" && normalized !== "libgeo" && normalized !== "an";
      });

      if (valueColumnIndex < 0) {
        throw new Error(`Colonne valeur introuvable dans ${params.label}.`);
      }
      continue;
    }

    const inseeCode = normalizeInseeCode(cells[0] ?? "");
    if (!inseeCode) {
      continue;
    }

    const entry = ensureEntry(params.cache, inseeCode);
    params.apply(entry, parseYear(cells[2] ?? ""), params.parseValue(cells[valueColumnIndex] ?? ""));
    processed += 1;
  }

  return processed;
}

async function main(): Promise<void> {
  const cache: ObservatoireAccessCommuneCache = {};

  console.log("Téléchargement — part population éloignée des soins de proximité (> 20 min)…");
  const healthProcessed = await ingestCsv({
    url: OT_HEALTH_DISTANT_SHARE_URL,
    destination: HEALTH_CSV_PATH,
    label: "acces_soin.part_pop_eloigne_soin",
    cache,
    parseValue: parsePercent,
    apply: (entry, year, value) => {
      entry.healthDistantSharePercent = value;
      entry.healthVintage = year;
    },
  });
  console.log(`   ${healthProcessed} communes indexées (santé).`);

  let centralityProcessed = 0;
  try {
    console.log("Téléchargement — temps d'accès moyen vers un centre d'équipements…");
    centralityProcessed = await ingestCsv({
      url: OT_CENTRALITY_ACCESS_MINUTES_URL,
      destination: CENTRALITY_CSV_PATH,
      label: "centr_tps_acces.temps_acces_centralites",
      cache,
      parseValue: parseMinutes,
      apply: (entry, year, value) => {
        entry.centralityAccessMinutes = value;
        entry.centralityVintage = year;
      },
    });
    console.log(`   ${centralityProcessed} communes indexées (centralités).`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`⚠ Centralités non ingérées : ${message}`);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(
    `\n✅ Cache Observatoire des territoires : ${OUTPUT_PATH} (${Object.keys(cache).length} communes).`,
  );
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion Observatoire des territoires :", error);
  process.exit(1);
});
