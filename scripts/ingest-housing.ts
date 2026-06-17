import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CACHE_DIR, parseCsvLine } from "./ingest-utils";
import type { HousingCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "housing-by-commune.json");
const SOURCE_URL =
  "https://static.data.gouv.fr/resources/repertoire-des-logements-locatifs-des-bailleurs-sociaux-rpls-2021/20230309-150841/rpls-2021.csv";

async function aggregateHousing(): Promise<HousingCommuneCache> {
  const response = await fetch(SOURCE_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Téléchargement RPLS impossible (statut ${response.status}).`);
  }

  const text = await response.text();
  const lines = text.split(/\r?\n/);
  const cache: HousingCommuneCache = {};

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    const [
      com,
      ,
      ,
      ,
      ,
      ,
      ,
      ,
      loueRaw,
      vacantRaw,
      ,
      ,
      ,
      ,
      ,
      tot21Raw,
    ] = parseCsvLine(line);

    const totalUnits = Number.parseInt(tot21Raw, 10);
    if (Number.isNaN(totalUnits)) {
      continue;
    }

    cache[com] = {
      year: 2021,
      totalUnits,
      occupiedUnits: Number.parseInt(loueRaw, 10) || 0,
      vacantUnits: Number.parseInt(vacantRaw, 10) || 0,
    };
  }

  return cache;
}

async function main(): Promise<void> {
  const cache = await aggregateHousing();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache RPLS généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion RPLS :", error);
  process.exit(1);
});
