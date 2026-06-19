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
  parseFrenchDecimal,
  stripCsvBom,
} from "./ingest-utils";
import { IPS_ECOLES_FILE_URL } from "../lib/sources";
import type { IpsCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "ips-by-commune.json");
const CSV_PATH = resolve(CACHE_DIR, "ips-ecoles.csv");

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

async function aggregateIps(): Promise<IpsCommuneCache> {
  await assertDownloadUnderMaxBytes(IPS_ECOLES_FILE_URL);
  await downloadFile(IPS_ECOLES_FILE_URL, CSV_PATH);
  assertFileUnderMaxBytes(CSV_PATH);

  const valuesByCommuneYear = new Map<string, Map<string, number[]>>();
  let latestSchoolYear = "";

  const stream = createInterface({
    input: createCsvReadStream(CSV_PATH),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      const headers = parseCsvLine(stripCsvBom(line));
      headerIndex = new Map(headers.map((name, position) => [name, position]));
      continue;
    }

    const cells = parseCsvLine(line);
    const get = (key: string): string => cells[headerIndex!.get(key) ?? -1] ?? "";

    const schoolYear = get("rentree_scolaire").trim();
    if (!schoolYear) {
      continue;
    }

    if (schoolYear > latestSchoolYear) {
      latestSchoolYear = schoolYear;
    }

    const inseeCode = normalizeInseeCode(get("code_insee_de_la_commune"));
    const ips = parseFrenchDecimal(get("ips"));
    if (!inseeCode || ips === null) {
      continue;
    }

    const byYear = valuesByCommuneYear.get(inseeCode) ?? new Map<string, number[]>();
    const values = byYear.get(schoolYear) ?? [];
    values.push(ips);
    byYear.set(schoolYear, values);
    valuesByCommuneYear.set(inseeCode, byYear);
  }

  const cache: IpsCommuneCache = {};
  for (const [inseeCode, byYear] of valuesByCommuneYear) {
    const values = byYear.get(latestSchoolYear);
    if (!values || values.length === 0) {
      continue;
    }

    cache[inseeCode] = {
      schoolYear: latestSchoolYear,
      averageIps:
        Math.round(
          (values.reduce((sum, value) => sum + value, 0) / values.length) * 10,
        ) / 10,
      schoolsWithIps: values.length,
      ipsMin: Math.min(...values),
      ipsMax: Math.max(...values),
    };
  }

  return cache;
}

async function main(): Promise<void> {
  const cache = await aggregateIps();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache, null, 2));
  console.log(`Cache IPS écrit : ${OUTPUT_PATH} (${Object.keys(cache).length} communes).`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
