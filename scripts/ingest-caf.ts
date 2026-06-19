import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import {
  CACHE_DIR,
  assertDownloadUnderMaxBytes,
  assertFileUnderMaxBytes,
  createCsvReadStream,
  downloadFile,
  parseCsvLine,
  stripCsvBom,
} from "./ingest-utils";
import { CNAF_PRECARITE_FILE_URL, CNAF_RSA_VINTAGE } from "../lib/sources";
import type { CafCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "caf-by-commune.json");
const CSV_PATH = resolve(CACHE_DIR, "cnaf-indicateurs-precarite.csv");

const COMMUNE_LEVEL = "commune";

function normalizeInseeCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (/^2[A-B]\d{3}$/.test(trimmed)) {
    return trimmed;
  }

  const numeric = trimmed.padStart(5, "0");
  if (/^\d{5}$/.test(numeric)) {
    return numeric;
  }

  return null;
}

function parsePercent(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".").replace("%", "");
  if (!trimmed || trimmed.toLowerCase() === "s" || trimmed.toLowerCase() === "nd") {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed;
}

function isCommuneLevel(raw: string): boolean {
  return raw.trim().toLowerCase().startsWith(COMMUNE_LEVEL);
}

async function main(): Promise<void> {
  console.log("Téléchargement indicateurs territoriaux de précarité (CNAF)…");
  await assertDownloadUnderMaxBytes(CNAF_PRECARITE_FILE_URL);
  await downloadFile(CNAF_PRECARITE_FILE_URL, CSV_PATH);
  await assertFileUnderMaxBytes(CSV_PATH);

  const cache: CafCommuneCache = {};
  const stream = createCsvReadStream(CSV_PATH);
  const reader = createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] | null = null;
  let rsaColumnIndex = -1;
  let levelColumnIndex = -1;
  let processed = 0;

  for await (const line of reader) {
    const cells = parseCsvLine(stripCsvBom(line));

    if (!headers) {
      headers = cells;
      levelColumnIndex = headers.findIndex((name) =>
        /^niveau g/i.test(name.trim()),
      );
      rsaColumnIndex = headers.findIndex((name) =>
        /^part des allocataires du rsa/i.test(name.trim()),
      );

      if (levelColumnIndex < 0 || rsaColumnIndex < 0) {
        throw new Error(
          `Colonnes attendues introuvables dans le CSV CNAF (niveau=${levelColumnIndex}, rsa=${rsaColumnIndex}).`,
        );
      }
      continue;
    }

    const level = cells[levelColumnIndex] ?? "";
    if (!isCommuneLevel(level)) {
      continue;
    }

    const inseeCode = normalizeInseeCode(cells[0] ?? "");
    if (!inseeCode) {
      continue;
    }

    cache[inseeCode] = {
      rsaShareAmongHouseholdsPercent: parsePercent(cells[rsaColumnIndex] ?? ""),
      vintage: CNAF_RSA_VINTAGE,
    };
    processed += 1;
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache, null, 0));
  console.log(
    `✅ Cache CNAF écrit : ${processed} communes → ${OUTPUT_PATH} (RSA ${CNAF_RSA_VINTAGE}).`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
