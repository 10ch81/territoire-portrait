import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { CACHE_DIR, downloadFile } from "./ingest-utils";
import type { IrveCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "irve-by-commune.json");
const SOURCE_URL =
  "https://static.data.gouv.fr/resources/base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques/20260617-035118/consolidation-etalab-schema-irve-statique-v-2.3.1-20260617.csv";
const CSV_PATH = resolve(CACHE_DIR, "irve-national.csv");

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

async function aggregateIrve(): Promise<IrveCommuneCache> {
  const { existsSync } = await import("node:fs");

  if (!existsSync(CSV_PATH)) {
    await downloadFile(SOURCE_URL, CSV_PATH);
  }

  const cache: IrveCommuneCache = {};
  const stationIdsByCommune = new Map<string, Set<string>>();

  const stream = createInterface({
    input: createReadStream(CSV_PATH, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let inseeIndex = -1;
  let pointsIndex = -1;
  let stationIndex = -1;

  for await (const line of stream) {
    lineNumber += 1;
    if (!line.trim()) {
      continue;
    }

    const cells = parseCsvLine(line);

    if (lineNumber === 1) {
      inseeIndex = cells.indexOf("code_insee_commune");
      pointsIndex = cells.indexOf("nbre_pdc");
      stationIndex = cells.indexOf("id_station_itinerance");
      continue;
    }

    if (inseeIndex < 0 || pointsIndex < 0 || stationIndex < 0) {
      throw new Error("Colonnes IRVE introuvables.");
    }

    const inseeCode = cells[inseeIndex];
    if (!inseeCode) {
      continue;
    }

    const chargingPoints = Number.parseInt(cells[pointsIndex] ?? "1", 10) || 1;
    const entry = cache[inseeCode] ?? {
      year: 2026,
      chargingPoints: 0,
      stations: 0,
    };

    entry.chargingPoints += chargingPoints;

    const stationId = cells[stationIndex];
    if (stationId) {
      const stations = stationIdsByCommune.get(inseeCode) ?? new Set<string>();
      stations.add(stationId);
      stationIdsByCommune.set(inseeCode, stations);
      entry.stations = stations.size;
    }

    cache[inseeCode] = entry;
  }

  return cache;
}

async function main(): Promise<void> {
  const cache = await aggregateIrve();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache IRVE généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion IRVE :", error);
  process.exit(1);
});
