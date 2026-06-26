import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  downloadFile,
  extractZip,
} from "./ingest-utils";
import {
  FILOSOFI_FILE_URL,
  RP_EMPLOYMENT_FILE_URL,
  RP_POPULATION_FILE_URL,
  RP_VINTAGE,
  FILOSOFI_VINTAGE,
} from "../lib/sources";
import { aggregateSocialCommuneCache } from "./duckdb/social-aggregate";
import { withDuckDbSession } from "./duckdb/session";

const OUTPUT_PATH = resolve(CACHE_DIR, "social-by-commune.json");

const RP_POP_ZIP = resolve(CACHE_DIR, `rp-pop-${RP_VINTAGE}.zip`);
const RP_POP_DIR = resolve(CACHE_DIR, `rp-pop-${RP_VINTAGE}-extract`);
const RP_EMPLOI_ZIP = resolve(CACHE_DIR, `rp-emploi-${RP_VINTAGE}.zip`);
const RP_EMPLOI_DIR = resolve(CACHE_DIR, `rp-emploi-${RP_VINTAGE}-extract`);
const FILOSOFI_ZIP = resolve(CACHE_DIR, `filosofi-${FILOSOFI_VINTAGE}.zip`);
const FILOSOFI_DIR = resolve(CACHE_DIR, `filosofi-${FILOSOFI_VINTAGE}-extract`);

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

async function main(): Promise<void> {
  if (!existsSync(RP_POP_ZIP)) {
    await downloadFile(RP_POPULATION_FILE_URL, RP_POP_ZIP);
  }
  extractZip(RP_POP_ZIP, RP_POP_DIR);

  if (!existsSync(RP_EMPLOI_ZIP)) {
    await downloadFile(RP_EMPLOYMENT_FILE_URL, RP_EMPLOI_ZIP);
  }
  extractZip(RP_EMPLOI_ZIP, RP_EMPLOI_DIR);

  if (!existsSync(FILOSOFI_ZIP)) {
    await downloadFile(FILOSOFI_FILE_URL, FILOSOFI_ZIP);
  }
  extractZip(FILOSOFI_ZIP, FILOSOFI_DIR);

  const paths = {
    populationCsvPath: findCsvFile(RP_POP_DIR, `base-cc-evol-struct-pop-${RP_VINTAGE}`),
    employmentCsvPath: findCsvFile(
      RP_EMPLOI_DIR,
      `base-cc-emploi-pop-active-${RP_VINTAGE}`,
    ),
    filosofiCsvPath: findCsvFile(
      FILOSOFI_DIR,
      `DS_FILOSOFI_CC_${FILOSOFI_VINTAGE}_data`,
    ),
  };

  console.log(`Agrégation socio-démographie via DuckDB (RP ${RP_VINTAGE})…`);

  const cache = await withDuckDbSession((connection) =>
    aggregateSocialCommuneCache(connection, paths),
  );

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache socio-démographique généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion socio-démographique :", error);
  process.exit(1);
});
