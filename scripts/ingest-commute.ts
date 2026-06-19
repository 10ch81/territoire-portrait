import { existsSync, readdirSync, writeFileSync } from "node:fs";
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
import { RP_COMMUTE_FILE_URL, RP_VINTAGE } from "../lib/sources";
import type { CommuteCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "commute-by-commune.json");
const ZIP = resolve(CACHE_DIR, `rp-nav2a-${RP_VINTAGE}.zip`);
const EXTRACT_DIR = resolve(CACHE_DIR, `rp-nav2a-${RP_VINTAGE}-extract`);
const URL = RP_COMMUTE_FILE_URL;

const CAR_MODE = "5";
const PUBLIC_TRANSPORT_MODE = "6";
const BOTH_SEXES = "2";

function findCsvFile(directory: string): string {
  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find(
      (name) =>
        name.toLowerCase().endsWith(".csv") &&
        name.toLowerCase().includes("nav2a") &&
        !name.toLowerCase().includes("meta"),
    );

  if (!match) {
    throw new Error(`CSV NAV2A introuvable dans ${directory}.`);
  }

  return resolve(directory, match);
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
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

  const aggregates = new Map<
    string,
    { employed: number; car: number; publicTransport: number }
  >();
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
    if ((cells[headerIndex.get("NIVGEO") ?? -1] ?? "") !== "COM") {
      continue;
    }

    const inseeCode = cells[headerIndex.get("CODGEO") ?? -1] ?? "";
    if (!/^\d{5}$/.test(inseeCode)) {
      continue;
    }

    if ((cells[headerIndex.get("SEXE") ?? -1] ?? "") !== BOTH_SEXES) {
      continue;
    }

    const mode = cells[headerIndex.get("TRANS_19") ?? -1] ?? "";
    const count = parseFrenchDecimal(cells[headerIndex.get("NB") ?? -1] ?? "");
    if (count === null || count <= 0) {
      continue;
    }

    const entry = aggregates.get(inseeCode) ?? { employed: 0, car: 0, publicTransport: 0 };
    entry.employed += count;
    if (mode === CAR_MODE) {
      entry.car += count;
    }
    if (mode === PUBLIC_TRANSPORT_MODE) {
      entry.publicTransport += count;
    }
    aggregates.set(inseeCode, entry);
  }

  const cache: CommuteCommuneCache = {};
  for (const [inseeCode, entry] of aggregates) {
    if (entry.employed <= 0) {
      continue;
    }

    cache[inseeCode] = {
      year: RP_VINTAGE,
      employedCount: Math.round(entry.employed),
      carSharePercent: roundOneDecimal((entry.car / entry.employed) * 100),
      publicTransportSharePercent: roundOneDecimal(
        (entry.publicTransport / entry.employed) * 100,
      ),
    };
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache mobilité domicile-travail généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion mobilité domicile-travail :", error);
  process.exit(1);
});
