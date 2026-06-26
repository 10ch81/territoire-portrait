import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CACHE_DIR } from "./ingest-utils";
import { aggregatePropertyCommuneCache } from "./duckdb/property-aggregate";
import { withDuckDbSession } from "./duckdb/session";

const OUTPUT_PATH = resolve(CACHE_DIR, "property-by-commune.json");

async function main(): Promise<void> {
  console.log("Agrégation DVF via DuckDB (téléchargements data.gouv)…");

  const cache = await withDuckDbSession((connection) =>
    aggregatePropertyCommuneCache(connection),
  );

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache DVF généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion DVF :", error);
  process.exit(1);
});
