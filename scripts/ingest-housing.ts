import {
  existsSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
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
import { RP_HOUSING_FILE_URL, RP_VINTAGE, RPLS_VINTAGE } from "../lib/sources";
import type { HousingCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "housing-by-commune.json");
const RPLS_URL =
  "https://static.data.gouv.fr/resources/repertoire-des-logements-locatifs-des-bailleurs-sociaux-rpls-2021/20230309-150841/rpls-2021.csv";
const LOGEMENT_ZIP = resolve(CACHE_DIR, `rp-logement-${RP_VINTAGE}.zip`);
const LOGEMENT_DIR = resolve(CACHE_DIR, `rp-logement-${RP_VINTAGE}-extract`);
const LOGEMENT_URL = RP_HOUSING_FILE_URL;

function findCsvFile(directory: string, prefix: string): string {
  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find(
      (name) =>
        name.toLowerCase().endsWith(".csv") &&
        name.toLowerCase().includes(prefix.toLowerCase()) &&
        !name.toLowerCase().includes("meta"),
    );

  if (!match) {
    throw new Error(`CSV introuvable dans ${directory} (${prefix}).`);
  }

  return resolve(directory, match);
}

async function aggregateRpls(): Promise<HousingCommuneCache> {
  const response = await fetch(RPLS_URL);
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
      year: RPLS_VINTAGE,
      totalUnits,
      occupiedUnits: Number.parseInt(loueRaw, 10) || 0,
      vacantUnits: Number.parseInt(vacantRaw, 10) || 0,
      totalDwellings: null,
      rpVacantDwellings: null,
      rpVacancyRatePercent: null,
    };
  }

  return cache;
}

async function enrichWithTotalDwellings(
  cache: HousingCommuneCache,
): Promise<void> {
  if (!existsSync(LOGEMENT_ZIP)) {
    await downloadFile(LOGEMENT_URL, LOGEMENT_ZIP);
  }
  extractZip(LOGEMENT_ZIP, LOGEMENT_DIR);

  const csvPath = findCsvFile(LOGEMENT_DIR, `base-cc-logement-${RP_VINTAGE}`);
  const stream = createInterface({
    input: createCsvReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;
  const dwellingsColumn = "P22_LOG";
  const vacantColumn = "P22_LOGVAC";

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
    const inseeCode = cells[0];
    if (!inseeCode) {
      continue;
    }

    const totalDwellings = parseFrenchDecimal(
      cells[headerIndex.get(dwellingsColumn) ?? -1] ?? "",
    );
    const vacantDwellings = parseFrenchDecimal(
      cells[headerIndex.get(vacantColumn) ?? -1] ?? "",
    );
    if (totalDwellings === null) {
      continue;
    }

    const roundedTotal = Math.round(totalDwellings);
    const roundedVacant =
      vacantDwellings !== null ? Math.round(vacantDwellings) : null;
    const vacancyRatePercent =
      roundedVacant !== null && roundedTotal > 0
        ? Math.round((roundedVacant / roundedTotal) * 1000) / 10
        : null;

    const entry = cache[inseeCode];
    if (entry) {
      entry.totalDwellings = roundedTotal;
      entry.rpVacantDwellings = roundedVacant;
      entry.rpVacancyRatePercent = vacancyRatePercent;
    } else {
      cache[inseeCode] = {
        year: RP_VINTAGE,
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        totalDwellings: roundedTotal,
        rpVacantDwellings: roundedVacant,
        rpVacancyRatePercent: vacancyRatePercent,
      };
    }
  }
}

async function main(): Promise<void> {
  console.log("Ingestion RPLS…");
  const cache = await aggregateRpls();

  console.log(`Enrichissement parc de logements (RP ${RP_VINTAGE})…`);
  await enrichWithTotalDwellings(cache);

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache RPLS généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion RPLS :", error);
  process.exit(1);
});
