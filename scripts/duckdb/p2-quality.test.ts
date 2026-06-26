import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import type { DepartmentRanksCommuneCache } from "@/lib/indicators/department-ranks";
import { assertCacheMatchesSample } from "./cache-regression";
import { aggregateDepartmentRanksCache } from "./department-ranks-aggregate";
import { withDuckDbSession } from "./session";
import { validateCacheJoinsWithDuckDb } from "./validate-cache-joins";
import { verifyGoldenCachesWithDuckDb } from "./verify-golden-caches";

const CACHE_DIR = resolve(process.cwd(), "data/cache");

describe("P2 DuckDB quality & ranks", () => {
  it("validate-cache-joins s'exécute sans erreur", async () => {
    const findings = await withDuckDbSession((connection) =>
      validateCacheJoinsWithDuckDb(connection),
    );
    assert.ok(Array.isArray(findings));
  });

  it("verify-golden-caches ne signale pas d'absence critique", async () => {
    const findings = await withDuckDbSession((connection) =>
      verifyGoldenCachesWithDuckDb(connection),
    );
    const critical = findings.filter((finding) => finding.severity === "critical");
    assert.equal(critical.length, 0, critical.map((item) => item.message).join(" | "));
  });

  it("department-ranks reproduit le cache existant (RUN_SLOW_DUCKDB=1, API Géo)", async () => {
    const cachePath = resolve(CACHE_DIR, "department-ranks-by-commune.json");
    if (!existsSync(cachePath) || process.env.RUN_SLOW_DUCKDB !== "1") {
      console.log("Skip : cache absent ou RUN_SLOW_DUCKDB≠1.");
      return;
    }

    const existing = JSON.parse(
      readFileSync(cachePath, "utf-8"),
    ) as DepartmentRanksCommuneCache;
    const rebuilt = await withDuckDbSession((connection) =>
      aggregateDepartmentRanksCache(connection),
    );
    assertCacheMatchesSample(rebuilt, existing, "Rangs départementaux");
  });
});
