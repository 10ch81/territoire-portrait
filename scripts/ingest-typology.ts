import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { read, utils } from "xlsx";
import {
  CACHE_DIR,
  createCsvReadStream,
  downloadFile,
  extractZip,
  parseCsvLine,
  stripCsvBom,
} from "./ingest-utils";
import {
  DENSITY_GRID_LABELS,
  DENSITY_GRID_SIMPLIFIED,
} from "../lib/typology/labels";
import type { TypologyCommuneCache } from "../lib/typology/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "typology-by-commune.json");

const DENSITY_CSV_URL =
  "https://geoterritoires.hautsdefrance.fr/api/v1/functions/GC_API_download.php?lang=fr&type=stat&dataset=grildens&indic=typodens7&nivgeo=com2024&filter=last&format=csv";

const UU_ZIP_URL =
  "https://www.insee.fr/fr/statistiques/fichier/7671844/table-appartenance-geo-communes-2024.zip";
const UU_ZIP = resolve(CACHE_DIR, "cog-appartenance-geo-2024.zip");
const UU_EXTRACT = resolve(CACHE_DIR, "cog-appartenance-geo-2024-extract");

const PVD_CSV_URL =
  "https://static.data.gouv.fr/resources/programme-petites-villes-de-demain/20240102-144402/liste-pvd-com2023-20240102.csv";
const ACV_CSV_URL =
  "https://static.data.gouv.fr/resources/programme-action-coeur-de-ville/20240205-160249/liste-acv-com2023-20240205.csv";
const VILLAGES_CSV_URL =
  "https://static.data.gouv.fr/resources/dispositif-villages-davenir/20260604-090609/liste-va-com2025-20260602.csv";

const POLICY_SOURCES = [
  { key: "petitesVillesDeDemain" as const, url: PVD_CSV_URL, label: "PVD" },
  { key: "actionCoeurDeVille" as const, url: ACV_CSV_URL, label: "ACV" },
  { key: "villagesAvenir" as const, url: VILLAGES_CSV_URL, label: "Villages d'avenir" },
];

function normalizeInseeCode(value: string): string | null {
  const code = value.trim().replace(/\D/g, "").slice(-5);
  return /^\d{5}$/.test(code) ? code : null;
}

function normalizeDensityLevelCode(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  const match = trimmed.match(/^t?([1-7])$/);
  return match ? match[1] : null;
}

function detectInseeColumn(headers: Map<string, number>): number {
  for (const name of [
    "CODGEO",
    "codgeo",
    "code_insee",
    "INSEE_COM",
    "insee_com",
    "Code INSEE",
    "code_commune",
    "code_insee_commune",
  ]) {
    const index = headers.get(name);
    if (index !== undefined) return index;
  }

  for (const [name, index] of headers) {
    if (/insee|codgeo|code.?commune/i.test(name)) {
      return index;
    }
  }

  return -1;
}

function detectDelimiter(line: string): ";" | "," {
  return line.includes(";") ? ";" : ",";
}

async function ingestDensityGrid(cache: TypologyCommuneCache): Promise<number> {
  const destination = resolve(CACHE_DIR, "density-grid-2024.csv");
  if (!existsSync(destination)) {
    await downloadFile(DENSITY_CSV_URL, destination);
  }

  const stream = createInterface({
    input: createCsvReadStream(destination),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;
  let delimiter: ";" | "," = ";";
  let count = 0;

  for await (const rawLine of stream) {
    const line = stripCsvBom(rawLine);
    if (!line.trim()) continue;

    if (!headerIndex) {
      delimiter = detectDelimiter(line);
      const headers = parseCsvLine(line, delimiter);
      headerIndex = new Map(headers.map((name, position) => [name.trim(), position]));
      continue;
    }

    const cells = parseCsvLine(line, delimiter);
    const inseeIndex = detectInseeColumn(headerIndex);
    const levelIndex =
      headerIndex.get("typodens7") ??
      headerIndex.get("typo") ??
      headerIndex.get("TYPODENS") ??
      headerIndex.get("grille_densite") ??
      -1;

    if (inseeIndex < 0 || levelIndex < 0) continue;

    const inseeCode = normalizeInseeCode(cells[inseeIndex] ?? "");
    const levelCode = normalizeDensityLevelCode(cells[levelIndex] ?? "");
    if (!inseeCode || !levelCode) continue;

    cache[inseeCode] ??= {};
    cache[inseeCode].densityGrid = {
      levelCode,
      levelLabel: DENSITY_GRID_LABELS[levelCode] ?? levelCode,
      simplifiedLabel: DENSITY_GRID_SIMPLIFIED[levelCode] ?? levelCode,
      vintage: 2024,
    };
    count += 1;
  }

  console.log(`   Grille densité indexée : ${count} communes`);
  return count;
}

function findXlsxFile(directory: string): string {
  const match = readdirSync(directory, { recursive: true })
    .map(String)
    .find((name) => name.toLowerCase().endsWith(".xlsx"));

  if (!match) {
    throw new Error(`XLSX introuvable dans ${directory}.`);
  }

  return resolve(directory, match);
}

function deriveUrbanUnitRole(unitCode: string): string {
  if (/^\d{2}000$/.test(unitCode) || unitCode === "00000") {
    return "H";
  }
  return "I";
}

async function ingestUrbanUnits(cache: TypologyCommuneCache): Promise<number> {
  if (!existsSync(UU_ZIP)) {
    await downloadFile(UU_ZIP_URL, UU_ZIP);
  }

  if (existsSync(UU_EXTRACT)) {
    const hasData = readdirSync(UU_EXTRACT, { recursive: true })
      .map(String)
      .some((name) => name.toLowerCase().endsWith(".xlsx"));
    if (!hasData) {
      rmSync(UU_EXTRACT, { recursive: true, force: true });
    }
  }

  extractZip(UU_ZIP, UU_EXTRACT);

  const xlsxPath = findXlsxFile(UU_EXTRACT);
  const workbook = read(readFileSync(xlsxPath), { type: "buffer", dense: true });
  const matrix = utils.sheet_to_json<string[]>(workbook.Sheets.COM, {
    header: 1,
    defval: "",
  });

  let headerRowIndex = -1;
  for (let index = 0; index < Math.min(20, matrix.length); index += 1) {
    const row = matrix[index] as string[];
    if (row.some((cell) => String(cell).trim() === "CODGEO")) {
      headerRowIndex = index;
      break;
    }
  }

  if (headerRowIndex < 0) {
    throw new Error("En-tête CODGEO introuvable dans la feuille COM.");
  }

  const headers = (matrix[headerRowIndex] as string[]).map((cell) => String(cell).trim());
  const headerIndex = new Map(headers.map((name, position) => [name, position]));
  const inseeIndex = headerIndex.get("CODGEO") ?? -1;
  const uuCodeIndex = headerIndex.get("UU2020") ?? -1;

  if (inseeIndex < 0 || uuCodeIndex < 0) {
    throw new Error("Colonnes CODGEO ou UU2020 introuvables.");
  }

  let count = 0;
  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const cells = matrix[rowIndex] as string[];
    const inseeCode = normalizeInseeCode(cells[inseeIndex] ?? "");
    const unitCode = String(cells[uuCodeIndex] ?? "").trim();
    if (!inseeCode || !unitCode) continue;

    const roleCode = deriveUrbanUnitRole(unitCode);
    cache[inseeCode] ??= {};
    cache[inseeCode].urbanUnit = {
      unitCode,
      unitLabel: unitCode,
      roleCode,
      sizeClass: "0",
      vintage: 2020,
    };
    count += 1;
  }

  console.log(`   Unités urbaines indexées : ${count} communes`);
  return count;
}

async function ingestPolicyList(
  cache: TypologyCommuneCache,
  url: string,
  field: keyof NonNullable<TypologyCommuneCache[string]["publicPolicy"]>,
  vintage: number,
): Promise<number> {
  const fileName = url.split("/").pop() ?? "policy.csv";
  const destination = resolve(CACHE_DIR, fileName);

  if (!existsSync(destination)) {
    await downloadFile(url, destination);
  }

  const stream = createInterface({
    input: createCsvReadStream(destination),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;
  let count = 0;

  for await (const rawLine of stream) {
    const line = stripCsvBom(rawLine);
    if (!line.trim()) continue;

    if (!headerIndex) {
      const delimiter = detectDelimiter(line);
      const headers = parseCsvLine(line, delimiter);
      headerIndex = new Map(headers.map((name, position) => [name.trim(), position]));
      continue;
    }

    const delimiter = detectDelimiter(line);
    const cells = parseCsvLine(line, delimiter);
    const inseeIndex = detectInseeColumn(headerIndex);
    if (inseeIndex < 0) continue;

    const inseeCode = normalizeInseeCode(cells[inseeIndex] ?? "");
    if (!inseeCode) continue;

    cache[inseeCode] ??= {};
    cache[inseeCode].publicPolicy ??= {
      petitesVillesDeDemain: false,
      actionCoeurDeVille: false,
      franceRuralitesRevitalisation: false,
      franceRuralitesRevitalisationPlus: false,
      villagesAvenir: false,
      vintage,
    };

    if (field === "vintage") continue;
    cache[inseeCode].publicPolicy![field] = true;
    count += 1;
  }

  return count;
}

async function runStep(label: string, task: () => Promise<number>): Promise<void> {
  try {
    const count = await task();
    console.log(`   ${label} : ${count} communes`);
  } catch (error) {
    console.error(`   ⚠ ${label} — ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main(): Promise<void> {
  const cache: TypologyCommuneCache = {};

  console.log("▶ Grille communale de densité");
  await runStep("densité", () => ingestDensityGrid(cache));

  console.log("▶ Unités urbaines 2020");
  await runStep("unités urbaines", () => ingestUrbanUnits(cache));

  console.log("▶ Dispositifs publics nationaux");
  for (const source of POLICY_SOURCES) {
    await runStep(source.label, () =>
      ingestPolicyList(cache, source.url, source.key, 2024),
    );
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache typologie généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion typologie :", error);
  process.exit(1);
});
