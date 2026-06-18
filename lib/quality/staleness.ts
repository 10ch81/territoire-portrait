import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { QualityFinding } from "./types";

const CACHE_DIR = resolve(process.cwd(), "data/cache");
const STALE_DAYS = 45;

const CACHE_FILES = [
  "bpe-by-commune.json",
  "population-by-commune.json",
  "housing-by-commune.json",
  "irve-by-commune.json",
  "fiscal-by-commune.json",
  "property-by-commune.json",
  "social-by-commune.json",
  "geography-by-commune.json",
  "commute-by-commune.json",
  "qpv-by-commune.json",
];

export function checkCacheStaleness(): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const staleThresholdMs = STALE_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const filename of CACHE_FILES) {
    const path = resolve(CACHE_DIR, filename);
    if (!existsSync(path)) {
      findings.push({
        ruleId: "cache-missing",
        severity: "warning",
        location: `data/cache/${filename}`,
        message: `Cache absent : ${filename}`,
        class: "CACHE_STALE",
      });
      continue;
    }

    const { mtimeMs } = statSync(path);
    const ageDays = Math.floor((now - mtimeMs) / (24 * 60 * 60 * 1000));

    if (now - mtimeMs > staleThresholdMs) {
      findings.push({
        ruleId: "cache-stale",
        severity: "warning",
        location: `data/cache/${filename}`,
        message: `Cache ${filename} vieux de ${ageDays} jours (> ${STALE_DAYS})`,
        class: "CACHE_STALE",
      });
    }
  }

  return findings;
}
