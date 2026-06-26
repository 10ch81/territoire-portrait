import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import type {
  FloresCommuneCache,
  PropertyCommuneCache,
  SecurityCommuneCache,
  SociodemographicsCommuneCache,
} from "@/lib/types";
import { assertCacheMatchesSample } from "./cache-regression";
import { aggregateFloresCommuneCache } from "./flores-aggregate";
import { aggregatePropertyCommuneCache } from "./property-aggregate";
import { aggregateSecurityCommuneCache } from "./security-aggregate";
import { aggregateSocialCommuneCache } from "./social-aggregate";
import { withDuckDbSession } from "./session";
import {
  FILOSOFI_VINTAGE,
  RP_VINTAGE,
} from "@/lib/sources";

const CACHE_DIR = resolve(process.cwd(), "data/cache");

function findCsvFile(directory: string, prefix: string): string | null {
  if (!existsSync(directory)) {
    return null;
  }

  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find(
      (name) =>
        name.toLowerCase().endsWith(".csv") &&
        name.toLowerCase().includes(prefix.toLowerCase()) &&
        !name.toLowerCase().includes("meta"),
    );

  return match ? resolve(directory, match) : null;
}

function findFloresDataCsv(directory: string): string | null {
  if (!existsSync(directory)) {
    return null;
  }

  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find((name) => name.endsWith("_data.csv"));

  return match ? resolve(directory, match) : null;
}

describe("P1 DuckDB ingest regressions", () => {
  it("FLORES reproduit le cache existant", async () => {
    const csvPath = findFloresDataCsv(resolve(CACHE_DIR, "flores-a17-extract"));
    const cachePath = resolve(CACHE_DIR, "flores-by-commune.json");
    if (!csvPath || !existsSync(cachePath)) {
      console.log("Skip : sources FLORES absentes.");
      return;
    }

    const existing = JSON.parse(readFileSync(cachePath, "utf-8")) as FloresCommuneCache;
    const rebuilt = await withDuckDbSession((connection) =>
      aggregateFloresCommuneCache(connection, csvPath),
    );
    assertCacheMatchesSample(rebuilt, existing, "FLORES");
  });

  it("SSMSI commune reproduit le cache existant", async () => {
    const gzPath = resolve(CACHE_DIR, "ssmsi-commune.csv.gz");
    const cachePath = resolve(CACHE_DIR, "security-by-commune.json");
    if (!existsSync(gzPath) || !existsSync(cachePath)) {
      console.log("Skip : sources SSMSI absentes.");
      return;
    }

    const existing = JSON.parse(readFileSync(cachePath, "utf-8")) as SecurityCommuneCache;
    const rebuilt = await withDuckDbSession((connection) =>
      aggregateSecurityCommuneCache(connection, gzPath),
    );
    assertCacheMatchesSample(rebuilt, existing, "SSMSI commune");
  });

  it("Socio-démographie reproduit le cache existant", async () => {
    const paths = {
      populationCsvPath: findCsvFile(
        resolve(CACHE_DIR, `rp-pop-${RP_VINTAGE}-extract`),
        `base-cc-evol-struct-pop-${RP_VINTAGE}`,
      ),
      employmentCsvPath: findCsvFile(
        resolve(CACHE_DIR, `rp-emploi-${RP_VINTAGE}-extract`),
        `base-cc-emploi-pop-active-${RP_VINTAGE}`,
      ),
      filosofiCsvPath: findCsvFile(
        resolve(CACHE_DIR, `filosofi-${FILOSOFI_VINTAGE}-extract`),
        `DS_FILOSOFI_CC_${FILOSOFI_VINTAGE}_data`,
      ),
    };
    const cachePath = resolve(CACHE_DIR, "social-by-commune.json");

    if (
      !paths.populationCsvPath ||
      !paths.employmentCsvPath ||
      !paths.filosofiCsvPath ||
      !existsSync(cachePath)
    ) {
      console.log("Skip : sources socio-démographiques absentes.");
      return;
    }

    const existing = JSON.parse(
      readFileSync(cachePath, "utf-8"),
    ) as SociodemographicsCommuneCache;
    const rebuilt = await withDuckDbSession((connection) =>
      aggregateSocialCommuneCache(connection, {
        populationCsvPath: paths.populationCsvPath!,
        employmentCsvPath: paths.employmentCsvPath!,
        filosofiCsvPath: paths.filosofiCsvPath!,
      }),
    );
    assertCacheMatchesSample(rebuilt, existing, "Socio-démographie");
  });

  it("DVF reproduit le cache existant (RUN_SLOW_DUCKDB=1, réseau requis)", async () => {
    if (process.env.RUN_SLOW_DUCKDB !== "1") {
      console.log("Skip : définir RUN_SLOW_DUCKDB=1 pour tester DVF.");
      return;
    }

    const cachePath = resolve(CACHE_DIR, "property-by-commune.json");
    if (!existsSync(cachePath)) {
      console.log("Skip : cache DVF absent.");
      return;
    }

    const existing = JSON.parse(readFileSync(cachePath, "utf-8")) as PropertyCommuneCache;
    const rebuilt = await withDuckDbSession((connection) =>
      aggregatePropertyCommuneCache(connection),
    );
    assertCacheMatchesSample(rebuilt, existing, "DVF");
  });
});
