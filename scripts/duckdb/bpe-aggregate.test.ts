import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import type { BpeCommuneCache } from "@/lib/types";
import { assertCacheMatchesSample } from "./cache-regression";
import {
  aggregateBpeCommuneCache,
  exportBpeTypeLabels,
} from "./bpe-aggregate";
import { withDuckDbSession } from "./session";

const CACHE_DIR = resolve(process.cwd(), "data/cache");
const DATA_CSV_PATH = resolve(CACHE_DIR, "bpe-2024-extract/DS_BPE_2024_data.csv");
const METADATA_CSV_PATH = resolve(
  CACHE_DIR,
  "bpe-2024-extract/DS_BPE_2024_metadata.csv",
);
const EXISTING_CACHE_PATH = resolve(CACHE_DIR, "bpe-by-commune.json");

describe("aggregateBpeCommuneCache (DuckDB)", () => {
  it("reproduit le cache BPE existant sur un échantillon de communes", async () => {
    if (!existsSync(DATA_CSV_PATH) || !existsSync(EXISTING_CACHE_PATH)) {
      console.log("Skip : CSV BPE ou cache existant absent.");
      return;
    }

    const existing = JSON.parse(
      readFileSync(EXISTING_CACHE_PATH, "utf-8"),
    ) as BpeCommuneCache;

    const duckdbCache = await withDuckDbSession((connection) =>
      aggregateBpeCommuneCache(connection, DATA_CSV_PATH),
    );

    assertCacheMatchesSample(duckdbCache, existing, "BPE");
  });

  it("exporte les libellés FACILITY_TYPE", async () => {
    if (!existsSync(METADATA_CSV_PATH)) {
      console.log("Skip : métadonnées BPE absentes.");
      return;
    }

    const labels = await withDuckDbSession((connection) =>
      exportBpeTypeLabels(connection, METADATA_CSV_PATH),
    );

    assert.ok(labels.D250, "libellé attendu pour le type D250");
    assert.ok(Object.keys(labels).length > 100, "volume de libellés BPE");
  });
});
