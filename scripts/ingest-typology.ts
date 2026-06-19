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

const UU_COMPOSITION_ZIP_URL =
  "https://www.insee.fr/fr/statistiques/fichier/4802589/UU2020_au_01-01-2024.zip";
const UU_COMPOSITION_ZIP = resolve(CACHE_DIR, "uu2020-composition-2024.zip");
const UU_COMPOSITION_EXTRACT = resolve(CACHE_DIR, "uu2020-composition-2024-extract");

const PVD_CSV_URL =
  "https://static.data.gouv.fr/resources/programme-petites-villes-de-demain/20240102-144402/liste-pvd-com2023-20240102.csv";
const ACV_CSV_URL =
  "https://static.data.gouv.fr/resources/programme-action-coeur-de-ville/20240205-160249/liste-acv-com2023-20240205.csv";
const VILLAGES_CSV_URL =
  "https://static.data.gouv.fr/resources/dispositif-villages-davenir/20260604-090609/liste-va-com2025-20260602.csv";
const FRR_XLSX_URL =
  "https://www.collectivites-locales.gouv.fr/files/files/3.%20Animer%20les%20territoires/5.%20La%20coh%C3%A9sion%20territoriale%20et%20l'am%C3%A9nagement%20du%20territoire/Liste%20communes%20FRR_juillet2025.xlsx";

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

function findHeaderRow(matrix: string[][], marker: string, scanLimit = 20): number {
  for (let index = 0; index < Math.min(scanLimit, matrix.length); index += 1) {
    const row = matrix[index] as string[];
    if (row.some((cell) => String(cell).trim() === marker)) {
      return index;
    }
  }
  return -1;
}

function loadUuSizeClasses(workbook: ReturnType<typeof read>): Map<string, string> {
  const matrix = utils.sheet_to_json<string[]>(workbook.Sheets.UU2020, {
    header: 1,
    defval: "",
  });
  const headerRowIndex = findHeaderRow(matrix, "UU2020");
  if (headerRowIndex < 0) {
    return new Map();
  }

  const headers = (matrix[headerRowIndex] as string[]).map((cell) => String(cell).trim());
  const headerIndex = new Map(headers.map((name, position) => [name, position]));
  const unitCodeIndex = headerIndex.get("UU2020") ?? -1;
  const sizeIndex = headerIndex.get("TUU2017") ?? -1;

  const sizes = new Map<string, string>();
  if (unitCodeIndex < 0 || sizeIndex < 0) {
    return sizes;
  }

  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const cells = matrix[rowIndex] as string[];
    const unitCode = String(cells[unitCodeIndex] ?? "").trim();
    const sizeClass = String(cells[sizeIndex] ?? "").trim();
    if (unitCode && sizeClass) {
      sizes.set(unitCode, sizeClass);
    }
  }

  return sizes;
}

async function ingestUrbanUnits(cache: TypologyCommuneCache): Promise<number> {
  if (!existsSync(UU_COMPOSITION_ZIP)) {
    await downloadFile(UU_COMPOSITION_ZIP_URL, UU_COMPOSITION_ZIP);
  }

  if (existsSync(UU_COMPOSITION_EXTRACT)) {
    const hasData = readdirSync(UU_COMPOSITION_EXTRACT, { recursive: true })
      .map(String)
      .some((name) => name.toLowerCase().endsWith(".xlsx"));
    if (!hasData) {
      rmSync(UU_COMPOSITION_EXTRACT, { recursive: true, force: true });
    }
  }

  extractZip(UU_COMPOSITION_ZIP, UU_COMPOSITION_EXTRACT);

  const xlsxPath = findXlsxFile(UU_COMPOSITION_EXTRACT);
  const workbook = read(readFileSync(xlsxPath), { type: "buffer", dense: true });
  const sizeByUnit = loadUuSizeClasses(workbook);
  const matrix = utils.sheet_to_json<string[]>(workbook.Sheets.Composition_communale, {
    header: 1,
    defval: "",
  });

  const headerRowIndex = findHeaderRow(matrix, "CODGEO");
  if (headerRowIndex < 0) {
    throw new Error("En-tête CODGEO introuvable dans Composition_communale.");
  }

  const headers = (matrix[headerRowIndex] as string[]).map((cell) => String(cell).trim());
  const headerIndex = new Map(headers.map((name, position) => [name, position]));
  const inseeIndex = headerIndex.get("CODGEO") ?? -1;
  const uuCodeIndex = headerIndex.get("UU2020") ?? -1;
  const uuLabelIndex = headerIndex.get("LIBUU2020") ?? -1;
  const roleIndex = headerIndex.get("STATUT_COM_UU") ?? -1;

  if (inseeIndex < 0 || uuCodeIndex < 0 || roleIndex < 0) {
    throw new Error("Colonnes CODGEO, UU2020 ou STATUT_COM_UU introuvables.");
  }

  let count = 0;
  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const cells = matrix[rowIndex] as string[];
    const inseeCode = normalizeInseeCode(cells[inseeIndex] ?? "");
    const unitCode = String(cells[uuCodeIndex] ?? "").trim();
    if (!inseeCode || !unitCode) continue;

    const roleCode = String(cells[roleIndex] ?? "H").trim().toUpperCase();
    cache[inseeCode] ??= {};
    cache[inseeCode].urbanUnit = {
      unitCode,
      unitLabel: String(cells[uuLabelIndex] ?? unitCode).trim() || unitCode,
      roleCode,
      sizeClass: sizeByUnit.get(unitCode) ?? "0",
      vintage: 2020,
    };
    count += 1;
  }

  console.log(`   Unités urbaines indexées : ${count} communes`);
  return count;
}

function isFrrClassified(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return normalized !== "non classée" && normalized.includes("frr");
}

function isFrrPlusClassified(label: string): boolean {
  return label.trim().toLowerCase().includes("frr+");
}

async function ingestFrr(cache: TypologyCommuneCache): Promise<number> {
  const destination = resolve(CACHE_DIR, "liste-communes-frr-juillet2025.xlsx");
  if (!existsSync(destination)) {
    await downloadFile(FRR_XLSX_URL, destination);
  }

  const workbook = read(readFileSync(destination), { type: "buffer" });
  const sheetName =
    workbook.SheetNames.find((name) => /frr/i.test(name)) ?? workbook.SheetNames[0];
  const rows = utils.sheet_to_json<Record<string, string>>(workbook.Sheets[sheetName], {
    defval: "",
  });

  let count = 0;
  for (const row of rows) {
    const inseeCode = normalizeInseeCode(row.Code_insee ?? row.CODGEO ?? "");
    const classification =
      row["Classement FRR et FRR+ au 10 juillet 2025"] ?? row.Classement ?? "";
    if (!inseeCode || !classification) continue;

    if (!isFrrClassified(classification)) {
      continue;
    }

    cache[inseeCode] ??= {};
    cache[inseeCode].publicPolicy ??= {
      petitesVillesDeDemain: false,
      actionCoeurDeVille: false,
      franceRuralitesRevitalisation: false,
      franceRuralitesRevitalisationPlus: false,
      villagesAvenir: false,
      vintage: 2025,
    };

    cache[inseeCode].publicPolicy!.franceRuralitesRevitalisation = true;
    if (isFrrPlusClassified(classification)) {
      cache[inseeCode].publicPolicy!.franceRuralitesRevitalisationPlus = true;
    }
    count += 1;
  }

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
  await runStep("FRR / FRR+", () => ingestFrr(cache));

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache typologie généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion typologie :", error);
  process.exit(1);
});
