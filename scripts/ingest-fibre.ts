import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { CACHE_DIR, createCsvReadStream, downloadFile } from "./ingest-utils";
import type { ArcepCommuneCache } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "arcep-by-commune.json");
const COMMUNE_URL =
  "https://data.arcep.fr/fixe/maconnexioninternet/statistiques/last/commune/commune.csv";
const TECHNO_URL =
  "https://data.arcep.fr/fixe/maconnexioninternet/statistiques/last/commune/commune_techno.csv";

const TECHNOLOGY_FIELDS: Array<{ field: string; label: string }> = [
  { field: "elig_ftth", label: "Fibre (FTTH)" },
  { field: "elig_coax", label: "Câble (coaxial)" },
  { field: "elig_cu", label: "Cuivre (DSL)" },
  { field: "elig_thdr", label: "Très haut débit radio" },
  { field: "elig_4gf", label: "4G fixe" },
  { field: "elig_hdr", label: "Haut débit radio" },
  { field: "elig_sat", label: "Satellite" },
];

function parseSemicolonCsvLine(line: string): string[] {
  return line.split(";").map((cell) => cell.replace(/^"|"$/g, "").trim());
}

async function loadPremisesByCommune(): Promise<
  Map<string, { vintage: string; totalPremises: number }>
> {
  const csvPath = resolve(CACHE_DIR, "arcep-commune.csv");
  await downloadFile(COMMUNE_URL, csvPath);

  const map = new Map<string, { vintage: string; totalPremises: number }>();
  const stream = createInterface({
    input: createCsvReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      const headers = parseSemicolonCsvLine(line.replace(/^\uFEFF/, ""));
      headerIndex = new Map(headers.map((name, position) => [name, position]));
      continue;
    }

    const cells = parseSemicolonCsvLine(line);
    const get = (key: string): string => cells[headerIndex!.get(key) ?? -1] ?? "";

    if (get("type") !== "all") {
      continue;
    }

    const inseeCode = get("code_insee").padStart(5, "0");
    const totalPremises = Number.parseInt(get("nbr"), 10);
    if (!/^\d{5}$/.test(inseeCode) || !Number.isFinite(totalPremises)) {
      continue;
    }

    map.set(inseeCode, {
      vintage: get("date") || "last",
      totalPremises,
    });
  }

  return map;
}

async function aggregateArcep(): Promise<ArcepCommuneCache> {
  const premises = await loadPremisesByCommune();
  const technoPath = resolve(CACHE_DIR, "arcep-commune-techno.csv");
  await downloadFile(TECHNO_URL, technoPath);

  const cache: ArcepCommuneCache = {};
  const stream = createInterface({
    input: createCsvReadStream(technoPath),
    crlfDelay: Infinity,
  });

  let headerIndex: Map<string, number> | null = null;

  for await (const line of stream) {
    if (!line.trim()) {
      continue;
    }

    if (!headerIndex) {
      const headers = parseSemicolonCsvLine(line.replace(/^\uFEFF/, ""));
      headerIndex = new Map(headers.map((name, position) => [name, position]));
      continue;
    }

    const cells = parseSemicolonCsvLine(line);
    const get = (key: string): string => cells[headerIndex!.get(key) ?? -1] ?? "";

    if (get("type") !== "all") {
      continue;
    }

    const inseeCode = get("code_insee").padStart(5, "0");
    if (!/^\d{5}$/.test(inseeCode)) {
      continue;
    }

    const premise = premises.get(inseeCode);
    const totalPremises = premise?.totalPremises ?? Number.parseInt(get("nbr"), 10);
    const fiberEligiblePremises = Number.parseInt(get("elig_ftth"), 10);

    if (!Number.isFinite(totalPremises) || totalPremises <= 0) {
      continue;
    }

    const technologies = TECHNOLOGY_FIELDS.filter(({ field }) => {
      const count = Number.parseInt(get(field), 10);
      return Number.isFinite(count) && count > 0;
    }).map(({ label }) => label);

    const fiberEligibleSharePercent =
      Number.isFinite(fiberEligiblePremises) && totalPremises > 0
        ? Math.round((fiberEligiblePremises / totalPremises) * 1000) / 10
        : null;

    cache[inseeCode] = {
      vintage: get("date") || premise?.vintage || "last",
      totalPremises,
      fiberEligiblePremises: Number.isFinite(fiberEligiblePremises)
        ? fiberEligiblePremises
        : 0,
      fiberEligibleSharePercent,
      technologies,
    };
  }

  return cache;
}

async function main(): Promise<void> {
  console.log("Agrégation ARCEP (Ma connexion internet)…");
  const cache = await aggregateArcep();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache ARCEP généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion ARCEP :", error);
  process.exit(1);
});
