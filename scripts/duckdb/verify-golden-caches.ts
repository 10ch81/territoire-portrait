import type { DuckDBConnection } from "@duckdb/node-api";
import { loadJsonCache } from "@/lib/enrichment/cache";
import { GOLDEN_COMMUNES } from "@/lib/quality/golden-communes";
import type { QualityFinding } from "@/lib/quality/types";

const REQUIRED_CACHES = [
  "social-by-commune.json",
  "housing-by-commune.json",
  "property-by-commune.json",
  "bpe-by-commune.json",
] as const;

export async function verifyGoldenCachesWithDuckDb(
  connection: DuckDBConnection,
): Promise<QualityFinding[]> {
  void connection;
  const findings: QualityFinding[] = [];
  const unionKeys = new Set<string>();

  for (const filename of REQUIRED_CACHES) {
    const cache = loadJsonCache<Record<string, unknown>>(filename);
    if (!cache) {
      continue;
    }

    for (const key of Object.keys(cache)) {
      unionKeys.add(key);
    }
  }

  for (const golden of GOLDEN_COMMUNES) {
    for (const filename of REQUIRED_CACHES) {
      const cache = loadJsonCache<Record<string, unknown>>(filename);
      if (cache && !(golden.inseeCode in cache)) {
        findings.push({
          ruleId: "duckdb-golden-cache-missing",
          severity: "warning",
          location: `data/cache/${filename}`,
          inseeCode: golden.inseeCode,
          message: `Golden commune ${golden.name} absente du cache ${filename}`,
          class: "JOIN_KEY_ERROR",
        });
      }
    }

    if (!unionKeys.has(golden.inseeCode)) {
      findings.push({
        ruleId: "duckdb-golden-absent-all",
        severity: "critical",
        location: "data/cache",
        inseeCode: golden.inseeCode,
        message: `Golden commune ${golden.name} absente de tous les caches critiques`,
        class: "JOIN_KEY_ERROR",
      });
    }
  }

  return findings;
}
