import { createReadStream, existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { CACHE_DIR, downloadFile } from "./ingest-utils";
import type { ProximityServicesCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "france-services-by-commune.json");
const DATASET_URL =
  "https://www.data.gouv.fr/api/1/datasets/liste-des-structures-labellisees-france-services/";
const CSV_PATH = resolve(CACHE_DIR, "france-services-national.csv");

function parseSemicolonCsvLine(line: string): string[] {
  return line.split(";").map((cell) => cell.replace(/^"|"$/g, "").trim());
}

async function resolveCsvUrl(): Promise<string> {
  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error(`Dataset France Services inaccessible (${response.status}).`);
  }

  const dataset = (await response.json()) as {
    resources?: Array<{ title?: string; url?: string }>;
  };

  const resource = dataset.resources?.find((entry) =>
    (entry.title ?? "").toLowerCase().includes("structures"),
  );

  if (!resource?.url) {
    throw new Error("Ressource CSV France Services introuvable.");
  }

  return resource.url;
}

async function main(): Promise<void> {
  if (!existsSync(CSV_PATH)) {
    const csvUrl = await resolveCsvUrl();
    await downloadFile(csvUrl, CSV_PATH);
  }

  const cache: ProximityServicesCommuneCache = {};
  const stream = createInterface({
    input: createReadStream(CSV_PATH, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let inseeIndex = -1;
  let labelIndex = -1;

  for await (const line of stream) {
    lineNumber += 1;
    if (!line.trim()) {
      continue;
    }

    const cells = parseSemicolonCsvLine(line.replace(/^\uFEFF/, ""));

    if (lineNumber === 1) {
      inseeIndex = cells.indexOf("insee_com");
      labelIndex = cells.indexOf("lib_fs");
      if (inseeIndex < 0 || labelIndex < 0) {
        throw new Error("Colonnes France Services introuvables.");
      }
      continue;
    }

    const inseeCode = cells[inseeIndex]?.padStart(5, "0");
    const label = cells[labelIndex]?.trim();
    if (!inseeCode || !/^\d{5}$/.test(inseeCode) || !label) {
      continue;
    }

    const entry = cache[inseeCode] ?? {
      year: 2025,
      count: 0,
      labels: [],
    };

    entry.count += 1;
    if (!entry.labels.includes(label)) {
      entry.labels.push(label);
    }
    cache[inseeCode] = entry;
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache France Services généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion France Services :", error);
  process.exit(1);
});
