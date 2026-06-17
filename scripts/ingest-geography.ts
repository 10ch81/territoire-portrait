import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CACHE_DIR, downloadFile, parseCsvLine } from "./ingest-utils";
import type { GeographyCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "geography-by-commune.json");
const AAV_URL =
  "https://static.data.gouv.fr/resources/zonage-en-aires-dattraction-des-villes-france-entiere-enrichi-zaav-2020/20220424-111604/table-appartenance-geo-communes-22.csv";
const TYPO_URL =
  "https://static.data.gouv.fr/resources/zonage-en-aires-dattraction-des-villes-france-entiere-enrichi-zaav-2020/20210521-183315/typo-zaav2020.csv";

async function loadTypology(): Promise<Map<string, string>> {
  const response = await fetch(TYPO_URL);
  const text = await response.text();
  const labels = new Map<string, string>();

  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) {
      continue;
    }

    const [code, label] = parseCsvLine(line);
    if (code && label) {
      labels.set(code, label);
    }
  }

  return labels;
}

async function aggregateGeography(): Promise<GeographyCommuneCache> {
  const [response, labels] = await Promise.all([fetch(AAV_URL), loadTypology()]);
  if (!response.ok) {
    throw new Error(`Téléchargement AAV impossible (statut ${response.status}).`);
  }

  const cache: GeographyCommuneCache = {};
  const lines = (await response.text()).split(/\r?\n/);

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    const [codeGeo, , , , , , , , , , , , aavCode, , , categoryCode] =
      parseCsvLine(line);

    if (!codeGeo || !aavCode) {
      continue;
    }

    cache[codeGeo] = {
      aavCode,
      categoryCode,
      categoryLabel: labels.get(categoryCode) ?? categoryCode,
    };
  }

  return cache;
}

async function main(): Promise<void> {
  const cache = await aggregateGeography();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache géographie généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion géographie :", error);
  process.exit(1);
});
