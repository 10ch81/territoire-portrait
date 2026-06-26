import type { DuckDBConnection } from "@duckdb/node-api";
import { loadJsonCache } from "@/lib/enrichment/cache";
import type { QualityFinding } from "@/lib/quality/types";

const PAIRED_CACHES: Array<{
  ruleId: string;
  leftFile: string;
  rightFile: string;
  message: string;
}> = [
  {
    ruleId: "duckdb-social-without-population",
    leftFile: "social-by-commune.json",
    rightFile: "population-by-commune.json",
    message: "Commune présente en socio-démographie mais absente de population historique",
  },
  {
    ruleId: "duckdb-bpe-without-population",
    leftFile: "bpe-by-commune.json",
    rightFile: "population-by-commune.json",
    message: "Commune présente en BPE mais absente de population historique",
  },
  {
    ruleId: "duckdb-flores-without-population",
    leftFile: "flores-by-commune.json",
    rightFile: "population-by-commune.json",
    message: "Commune présente en FLORES mais absente de population historique",
  },
];

async function createKeyTable(
  connection: DuckDBConnection,
  tableName: string,
  keys: string[],
): Promise<void> {
  if (keys.length === 0) {
    await connection.run(`CREATE TABLE ${tableName} (insee_code VARCHAR)`);
    return;
  }

  const values = keys.map((key) => `('${key.replace(/'/g, "''")}')`).join(", ");
  await connection.run(`
    CREATE TABLE ${tableName} AS
    SELECT * FROM (VALUES ${values}) AS t(insee_code)
  `);
}

export async function validateCacheJoinsWithDuckDb(
  connection: DuckDBConnection,
): Promise<QualityFinding[]> {
  const findings: QualityFinding[] = [];

  for (const pair of PAIRED_CACHES) {
    const leftCache = loadJsonCache<Record<string, unknown>>(pair.leftFile);
    const rightCache = loadJsonCache<Record<string, unknown>>(pair.rightFile);
    if (!leftCache || !rightCache) {
      continue;
    }

    await createKeyTable(connection, "left_codes", Object.keys(leftCache));
    await createKeyTable(connection, "right_codes", Object.keys(rightCache));

    const reader = await connection.runAndReadAll(`
      SELECT l.insee_code
      FROM left_codes l
      LEFT JOIN right_codes r ON l.insee_code = r.insee_code
      WHERE r.insee_code IS NULL
      LIMIT 25
    `);

    for (const row of reader.getRowObjectsJson()) {
      findings.push({
        ruleId: pair.ruleId,
        severity: "warning",
        location: `data/cache/${pair.leftFile}`,
        inseeCode: String(row.insee_code),
        message: pair.message,
        class: "JOIN_KEY_ERROR",
      });
    }

    await connection.run("DROP TABLE IF EXISTS left_codes");
    await connection.run("DROP TABLE IF EXISTS right_codes");
  }

  return findings;
}
