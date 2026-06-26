import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CACHE_DIR } from "./ingest-utils";
import { aggregateDepartmentRanksCache } from "./duckdb/department-ranks-aggregate";
import { withDuckDbSession } from "./duckdb/session";

const OUTPUT_PATH = resolve(CACHE_DIR, "department-ranks-by-commune.json");

async function main(): Promise<void> {
  console.log("Calcul des rangs départementaux via DuckDB…");

  const cache = await withDuckDbSession((connection) =>
    aggregateDepartmentRanksCache(connection),
  );

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache rangs départementaux : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion rangs départementaux :", error);
  process.exit(1);
});
