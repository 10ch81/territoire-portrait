import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CACHE_DIR, parseFrenchDecimal } from "./ingest-utils";
import type { PropertyCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "property-by-commune.json");
const SOURCE_URL =
  "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2024/20250707-085855/communesdvf2024.csv";

function parseCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim());
}

async function aggregateProperty(): Promise<PropertyCommuneCache> {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Téléchargement DVF impossible (statut ${response.status}).`);
  }

  const cache: PropertyCommuneCache = {};
  const lines = (await response.text()).split(/\r?\n/);

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    const [
      inseeCode,
      yearRaw,
      mutationCountRaw,
      ,
      ,
      ,
      ,
      averageTransactionPriceRaw,
      averagePricePerM2Raw,
    ] = parseCsvLine(line);

    const year = Number.parseInt(yearRaw, 10);
    if (year !== 2024) {
      continue;
    }

    cache[inseeCode] = {
      year,
      averagePricePerM2: parseFrenchDecimal(averagePricePerM2Raw),
      averageTransactionPrice: parseFrenchDecimal(averageTransactionPriceRaw),
      mutationCount: Number.parseInt(mutationCountRaw, 10) || null,
    };
  }

  return cache;
}

async function main(): Promise<void> {
  const cache = await aggregateProperty();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache DVF généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion DVF :", error);
  process.exit(1);
});
