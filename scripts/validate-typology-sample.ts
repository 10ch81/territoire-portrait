/**
 * Golden communes — typologie territoriale (cache + profils de comparaison).
 * Échec CI si cache absent, trop petit ou profils inattendus.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getEnrichedTerritoryByInsee } from "../lib/enrichment";
import type { ComparisonProfile } from "../lib/typology/types";

const CACHE_PATH = join(process.cwd(), "data/cache/typology-by-commune.json");
const MIN_COMMUNES = 30_000;

type GoldenExpectation = {
  comparisonProfile: ComparisonProfile;
  minFamilies: number;
  summaryPattern: RegExp;
};

const GOLDEN: Record<string, GoldenExpectation> = {
  "44109": {
    comparisonProfile: "metropole",
    minFamilies: 3,
    summaryPattern: /agglomération|métropole|dense/i,
  },
  "75056": {
    comparisonProfile: "metropole",
    minFamilies: 3,
    summaryPattern: /agglomération|métropole|dense/i,
  },
  "35238": {
    comparisonProfile: "metropole",
    minFamilies: 3,
    summaryPattern: /agglomération|métropole|dense/i,
  },
  "09225": {
    comparisonProfile: "grande_ville",
    minFamilies: 2,
    summaryPattern: /centralité|dense|agglomération/i,
  },
  "01001": {
    comparisonProfile: "periurbain",
    minFamilies: 2,
    summaryPattern: /rural|périurbain|centralité|agglomération/i,
  },
};

function assertCacheSize(): number {
  let raw: string;
  try {
    raw = readFileSync(CACHE_PATH, "utf8");
  } catch {
    throw new Error(`Cache introuvable : ${CACHE_PATH} — lancer npm run ingest:typology`);
  }

  const cache = JSON.parse(raw) as Record<string, unknown>;
  const count = Object.keys(cache).length;
  if (count < MIN_COMMUNES) {
    throw new Error(`Cache trop petit : ${count} communes (attendu ≥ ${MIN_COMMUNES})`);
  }
  return count;
}

export async function validateTypologySample(): Promise<void> {
  const cacheSize = assertCacheSize();
  let failures = 0;

  for (const [insee, expected] of Object.entries(GOLDEN)) {
    const territory = await getEnrichedTerritoryByInsee(insee);
    if (!territory) {
      console.error(`[validate:typology] ${insee} : commune introuvable`);
      failures += 1;
      continue;
    }

    const typology = territory.enrichment?.territoryTypology;
    if (!typology) {
      console.error(`[validate:typology] ${insee} : typologie absente`);
      failures += 1;
      continue;
    }

    const familyCount = typology.availableFamilies.length;
    const summaryLabel = typology.summaryLabel ?? "";
    let communeFailed = false;

    if (typology.comparisonProfile !== expected.comparisonProfile) {
      console.error(
        `[validate:typology] ${insee} : profil ${typology.comparisonProfile} (attendu ${expected.comparisonProfile})`,
      );
      communeFailed = true;
    }

    if (familyCount < expected.minFamilies) {
      console.error(
        `[validate:typology] ${insee} : ${familyCount} familles (attendu ≥ ${expected.minFamilies})`,
      );
      communeFailed = true;
    }

    if (!expected.summaryPattern.test(summaryLabel)) {
      console.error(
        `[validate:typology] ${insee} : summaryLabel « ${summaryLabel} » ne correspond pas`,
      );
      communeFailed = true;
    }

    if (communeFailed) {
      failures += 1;
      continue;
    }

    console.log(
      `[validate:typology] ${insee} OK — ${typology.comparisonProfile}, ${familyCount} familles, « ${summaryLabel} »`,
    );
  }

  if (failures > 0) {
    throw new Error(`${failures} échec(s) sur ${Object.keys(GOLDEN).length} communes golden`);
  }

  console.log(
    `[validate:typology] OK — ${cacheSize} communes, ${Object.keys(GOLDEN).length} golden validées`,
  );
}

async function main(): Promise<void> {
  try {
    await validateTypologySample();
  } catch (error) {
    console.error(`[validate:typology] ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

if (process.argv[1]?.includes("validate-typology-sample")) {
  void main();
}
