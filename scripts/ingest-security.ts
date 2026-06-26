import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  downloadFile,
} from "./ingest-utils";
import {
  aggregateSecurityCommuneCache,
  aggregateSecurityDepartmentCache,
} from "./duckdb/security-aggregate";
import { withDuckDbSession } from "./duckdb/session";

const COMMUNE_OUTPUT_PATH = resolve(CACHE_DIR, "security-by-commune.json");
const DEPARTMENT_OUTPUT_PATH = resolve(CACHE_DIR, "security-by-department.json");
const COMMUNE_GZ_PATH = resolve(CACHE_DIR, "ssmsi-commune.csv.gz");
const DEPARTMENT_CSV_PATH = resolve(CACHE_DIR, "ssmsi-department.csv");

const COMMUNE_URL =
  "https://static.data.gouv.fr/resources/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales/20260326-124144/donnee-data.gouv-2025-geographie2025-produit-le2026-02-03.csv.gz";
const DEPARTMENT_URL =
  "https://static.data.gouv.fr/resources/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales/20260129-160318/donnee-dep-data.gouv-2025-geographie2025-produit-le2026-01-22.csv";

async function main(): Promise<void> {
  if (!existsSync(COMMUNE_GZ_PATH)) {
    await downloadFile(COMMUNE_URL, COMMUNE_GZ_PATH);
  }
  if (!existsSync(DEPARTMENT_CSV_PATH)) {
    await downloadFile(DEPARTMENT_URL, DEPARTMENT_CSV_PATH);
  }

  console.log("Agrégation SSMSI via DuckDB…");

  const { communeCache, departmentCache } = await withDuckDbSession(
    async (connection) => ({
      communeCache: await aggregateSecurityCommuneCache(connection, COMMUNE_GZ_PATH),
      departmentCache: await aggregateSecurityDepartmentCache(
        connection,
        DEPARTMENT_CSV_PATH,
      ),
    }),
  );

  writeFileSync(COMMUNE_OUTPUT_PATH, JSON.stringify(communeCache));
  writeFileSync(DEPARTMENT_OUTPUT_PATH, JSON.stringify(departmentCache));

  console.log(
    `Cache SSMSI écrit : ${Object.keys(communeCache).length} communes, ${Object.keys(departmentCache).length} départements.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
