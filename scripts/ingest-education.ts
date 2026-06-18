import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { CACHE_DIR, createCsvReadStream, downloadFile, stripCsvBom } from "./ingest-utils";
import type { EducationCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "education-by-commune.json");
const CSV_PATH = resolve(CACHE_DIR, "education-annuaire.csv");
const EDUCATION_URL =
  "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/exports/csv?delimiter=%3B";
const EDUCATION_YEAR = 2026;

function parseSemicolonCsvLine(line: string): string[] {
  return line.split(";").map((cell) => cell.replace(/^"|"$/g, "").trim());
}

function normalizeSector(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("pub")) {
    return "Public";
  }
  if (normalized.startsWith("priv")) {
    return "Privé";
  }
  return value.trim() || "Non renseigné";
}

function incrementBucket(
  bucket: Record<string, number>,
  key: string,
  fallback: string,
): void {
  const normalized = key.trim() || fallback;
  bucket[normalized] = (bucket[normalized] ?? 0) + 1;
}

async function aggregateEducation(): Promise<EducationCommuneCache> {
  console.log("Téléchargement Annuaire de l'Éducation…");
  await downloadFile(EDUCATION_URL, CSV_PATH);

  console.log("Agrégation par commune…");

  const cache: EducationCommuneCache = {};
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
      const headers = parseSemicolonCsvLine(stripCsvBom(line));
      headerIndex = new Map(headers.map((name, position) => [name, position]));
      continue;
    }

    const cells = parseSemicolonCsvLine(line);
    const get = (key: string): string => cells[headerIndex!.get(key) ?? -1] ?? "";

    if (get("etat").toUpperCase() !== "OUVERT") {
      continue;
    }

    const inseeCode = get("code_commune").padStart(5, "0");
    if (!/^\d{5}$/.test(inseeCode)) {
      continue;
    }

    const entry = cache[inseeCode] ?? {
      year: EDUCATION_YEAR,
      totalOpen: 0,
      byType: {},
      bySector: {},
      byLevel: {},
    };

    entry.totalOpen += 1;
    incrementBucket(entry.byType, get("type_etablissement"), "Type non renseigné");
    incrementBucket(entry.bySector, normalizeSector(get("statut_public_prive")), "Non renseigné");
    incrementBucket(entry.byLevel, get("libelle_nature"), "Niveau non renseigné");
    cache[inseeCode] = entry;
  }

  return cache;
}

async function main(): Promise<void> {
  const cache = await aggregateEducation();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache Éducation généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion Éducation :", error);
  process.exit(1);
});
