import { createReadStream, existsSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  downloadFile,
  extractZip,
  parseCsvLine,
  parseFrenchDecimal,
} from "./ingest-utils";
import type { SociodemographicsCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "social-by-commune.json");

const RP_POP_ZIP = resolve(CACHE_DIR, "rp-pop-2021.zip");
const RP_POP_DIR = resolve(CACHE_DIR, "rp-pop-2021-extract");
const RP_POP_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8201904/base-cc-evol-struct-pop-2021_csv.zip";

const RP_EMPLOI_ZIP = resolve(CACHE_DIR, "rp-emploi-2021.zip");
const RP_EMPLOI_DIR = resolve(CACHE_DIR, "rp-emploi-2021-extract");
const RP_EMPLOI_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8202916/base-cc-emploi-pop-active-2021_csv.zip";

const FILOSOFI_ZIP = resolve(CACHE_DIR, "filosofi-2020.zip");
const FILOSOFI_DIR = resolve(CACHE_DIR, "filosofi-2020-extract");
const FILOSOFI_URL =
  "https://www.insee.fr/fr/statistiques/fichier/6692392/base-cc-filosofi-2020_CSV.zip";

const AGE_COLUMNS: Record<string, string> = {
  P21_POP0014: "0-14",
  P21_POP1529: "15-29",
  P21_POP3044: "30-44",
  P21_POP4559: "45-59",
  P21_POP6074: "60-74",
  P21_POP7589: "75-89",
  P21_POP90P: "90+",
};

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

function buildHeaderIndex(headerLine: string): Map<string, number> {
  const headers = parseCsvLine(headerLine);
  const index = new Map<string, number>();
  headers.forEach((name, position) => index.set(name, position));
  return index;
}

async function ingestAgeBands(
  cache: SociodemographicsCommuneCache,
): Promise<void> {
  if (!existsSync(RP_POP_ZIP)) {
    await downloadFile(RP_POP_URL, RP_POP_ZIP);
  }
  extractZip(RP_POP_ZIP, RP_POP_DIR);

  const csvPath = findCsvFile(RP_POP_DIR, "base-cc-evol-struct-pop-2021");
  const stream = createInterface({
    input: createReadStream(csvPath, { encoding: "latin1" }),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      headerIndex = buildHeaderIndex(line);
      continue;
    }

    const cells = parseCsvLine(line);
    const inseeCode = cells[0];
    if (!inseeCode) {
      continue;
    }

    const ageBands: Record<string, number> = {};
    for (const [column, label] of Object.entries(AGE_COLUMNS)) {
      const position = headerIndex.get(column);
      if (position === undefined) {
        continue;
      }
      const value = parseFrenchDecimal(cells[position] ?? "");
      if (value !== null) {
        ageBands[label] = value;
      }
    }

    cache[inseeCode] = {
      year: 2021,
      ageBands,
      unemploymentRate: cache[inseeCode]?.unemploymentRate ?? null,
      medianDisposableIncome: cache[inseeCode]?.medianDisposableIncome ?? null,
    };
  }
}

async function ingestUnemployment(
  cache: SociodemographicsCommuneCache,
): Promise<void> {
  if (!existsSync(RP_EMPLOI_ZIP)) {
    await downloadFile(RP_EMPLOI_URL, RP_EMPLOI_ZIP);
  }
  extractZip(RP_EMPLOI_ZIP, RP_EMPLOI_DIR);

  const csvPath = findCsvFile(RP_EMPLOI_DIR, "base-cc-emploi-pop-active-2021");
  const stream = createInterface({
    input: createReadStream(csvPath, { encoding: "latin1" }),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;
  const unemployedColumn = "P21_CHOM1564";
  const activeColumn = "P21_ACT1564";

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      headerIndex = buildHeaderIndex(line);
      continue;
    }

    const cells = parseCsvLine(line);
    const inseeCode = cells[0];
    if (!inseeCode) {
      continue;
    }

    const unemployed = parseFrenchDecimal(
      cells[headerIndex.get(unemployedColumn) ?? -1] ?? "",
    );
    const active = parseFrenchDecimal(cells[headerIndex.get(activeColumn) ?? -1] ?? "");
    const unemploymentRate =
      unemployed !== null && active !== null && active > 0
        ? Math.round((unemployed / active) * 1000) / 10
        : null;

    const entry = cache[inseeCode] ?? {
      year: 2021,
      ageBands: {},
      unemploymentRate: null,
      medianDisposableIncome: null,
    };

    entry.unemploymentRate = unemploymentRate;
    cache[inseeCode] = entry;
  }
}

async function ingestFilosofi(cache: SociodemographicsCommuneCache): Promise<void> {
  if (!existsSync(FILOSOFI_ZIP)) {
    await downloadFile(FILOSOFI_URL, FILOSOFI_ZIP);
  }
  extractZip(FILOSOFI_ZIP, FILOSOFI_DIR);

  const csvPath = findCsvFile(FILOSOFI_DIR, "cc_filosofi_2020_com");
  const stream = createInterface({
    input: createReadStream(csvPath, { encoding: "latin1" }),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;
  const incomeColumn = "MED20";

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      headerIndex = buildHeaderIndex(line);
      continue;
    }

    const cells = parseCsvLine(line);
    const inseeCode = cells[0];
    if (!inseeCode) {
      continue;
    }

    const medianIncome = parseFrenchDecimal(
      cells[headerIndex.get(incomeColumn) ?? -1] ?? "",
    );

    const entry = cache[inseeCode] ?? {
      year: 2021,
      ageBands: {},
      unemploymentRate: null,
      medianDisposableIncome: null,
    };

    entry.medianDisposableIncome = medianIncome;
    cache[inseeCode] = entry;
  }
}

async function main(): Promise<void> {
  const cache: SociodemographicsCommuneCache = {};

  console.log("Ingestion structure par âge (RP 2021)…");
  await ingestAgeBands(cache);

  console.log("Ingestion chômage (RP 2021)…");
  await ingestUnemployment(cache);

  console.log("Ingestion revenus FILOSOFI 2020…");
  await ingestFilosofi(cache);

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache socio-démographique généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion socio-démographique :", error);
  process.exit(1);
});
