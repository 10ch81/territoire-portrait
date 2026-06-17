import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CACHE_DIR, parseFrenchDecimal } from "./ingest-utils";
import type { PropertyCommuneCache, PropertyYearPrice } from "../lib/types";

const OUTPUT_PATH = resolve(CACHE_DIR, "property-by-commune.json");
const LATEST_YEAR = 2024;

const DVF_SOURCES: Array<{ year: number; url: string; legacy: boolean }> = [
  {
    year: 2014,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112248/dvf2014.csv",
    legacy: true,
  },
  {
    year: 2015,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112249/dvf2015.csv",
    legacy: true,
  },
  {
    year: 2016,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112249/dvf2016.csv",
    legacy: true,
  },
  {
    year: 2017,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112249/dvf2017.csv",
    legacy: true,
  },
  {
    year: 2018,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112250/dvf2018.csv",
    legacy: true,
  },
  {
    year: 2019,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112250/dvf2019.csv",
    legacy: true,
  },
  {
    year: 2020,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112251/dvf2020.csv",
    legacy: true,
  },
  {
    year: 2021,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112251/dvf2021.csv",
    legacy: true,
  },
  {
    year: 2022,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112252/dvf2022.csv",
    legacy: true,
  },
  {
    year: 2023,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112252/dvf2023.csv",
    legacy: true,
  },
  {
    year: 2024,
    url: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2024/20250707-085855/communesdvf2024.csv",
    legacy: false,
  },
];

interface DvfRow {
  inseeCode: string;
  year: number;
  mutationCount: number | null;
  houseMutations: number | null;
  apartmentMutations: number | null;
  houseSharePercent: number | null;
  apartmentSharePercent: number | null;
  averageTransactionPrice: number | null;
  averagePricePerM2: number | null;
}

function parseCsvCells(line: string): string[] {
  return line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim());
}

function departmentCodeFromInsee(inseeCode: string): string {
  if (inseeCode.startsWith("97") || inseeCode.startsWith("98")) {
    return inseeCode.slice(0, 3);
  }

  return inseeCode.slice(0, 2);
}

function parseDvfRow(line: string, legacy: boolean): DvfRow | null {
  const cells = parseCsvCells(line);
  if (cells.length < 8) {
    return null;
  }

  if (legacy) {
    const inseeCode = cells[1];
    const year = Number.parseInt(cells[2], 10);
    if (!inseeCode || Number.isNaN(year)) {
      return null;
    }

    return {
      inseeCode,
      year,
      mutationCount: Number.parseInt(cells[3], 10) || null,
      houseMutations: Number.parseInt(cells[4], 10) || null,
      apartmentMutations: Number.parseInt(cells[5], 10) || null,
      houseSharePercent: parseFrenchDecimal(cells[6] ?? ""),
      apartmentSharePercent: parseFrenchDecimal(cells[7] ?? ""),
      averageTransactionPrice: parseFrenchDecimal(cells[8] ?? ""),
      averagePricePerM2: parseFrenchDecimal(cells[9] ?? ""),
    };
  }

  const inseeCode = cells[0];
  const year = Number.parseInt(cells[1], 10);
  if (!inseeCode || Number.isNaN(year)) {
    return null;
  }

  return {
    inseeCode,
    year,
    mutationCount: Number.parseInt(cells[2], 10) || null,
    houseMutations: Number.parseInt(cells[3], 10) || null,
    apartmentMutations: Number.parseInt(cells[4], 10) || null,
    houseSharePercent: parseFrenchDecimal(cells[5] ?? ""),
    apartmentSharePercent: parseFrenchDecimal(cells[6] ?? ""),
    averageTransactionPrice: parseFrenchDecimal(cells[7] ?? ""),
    averagePricePerM2: parseFrenchDecimal(cells[8] ?? ""),
  };
}

async function loadDvfSource(
  source: (typeof DVF_SOURCES)[number],
): Promise<DvfRow[]> {
  console.log(`Téléchargement DVF ${source.year}…`);
  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(
      `Téléchargement DVF ${source.year} impossible (statut ${response.status}).`,
    );
  }

  const rows: DvfRow[] = [];
  const lines = (await response.text()).split(/\r?\n/);

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    const row = parseDvfRow(line, source.legacy);
    if (row) {
      rows.push(row);
    }
  }

  return rows;
}

function computeDepartmentAverages(
  cache: PropertyCommuneCache,
): PropertyCommuneCache {
  const departmentTotals = new Map<
    string,
    { weightedSum: number; weight: number }
  >();

  for (const entry of Object.values(cache)) {
    if (
      entry.year !== LATEST_YEAR ||
      entry.averagePricePerM2 === null ||
      entry.mutationCount === null ||
      entry.mutationCount <= 0
    ) {
      continue;
    }

    const bucket = departmentTotals.get(entry.departmentCode) ?? {
      weightedSum: 0,
      weight: 0,
    };
    bucket.weightedSum += entry.averagePricePerM2 * entry.mutationCount;
    bucket.weight += entry.mutationCount;
    departmentTotals.set(entry.departmentCode, bucket);
  }

  for (const entry of Object.values(cache)) {
    const bucket = departmentTotals.get(entry.departmentCode);
    entry.departmentAveragePricePerM2 =
      bucket && bucket.weight > 0
        ? Math.round(bucket.weightedSum / bucket.weight)
        : null;
  }

  return cache;
}

async function aggregateProperty(): Promise<PropertyCommuneCache> {
  const cache: PropertyCommuneCache = {};

  for (const source of DVF_SOURCES) {
    const rows = await loadDvfSource(source);

    for (const row of rows) {
      const existing = cache[row.inseeCode];
      const pricePoint: PropertyYearPrice = {
        year: row.year,
        averagePricePerM2: row.averagePricePerM2,
        mutationCount: row.mutationCount,
      };

      if (!existing) {
        cache[row.inseeCode] = {
          year: row.year,
          averagePricePerM2: row.averagePricePerM2,
          averageTransactionPrice: row.averageTransactionPrice,
          mutationCount: row.mutationCount,
          houseMutations: row.houseMutations,
          apartmentMutations: row.apartmentMutations,
          houseSharePercent: row.houseSharePercent,
          apartmentSharePercent: row.apartmentSharePercent,
          priceHistory: [pricePoint],
          departmentCode: departmentCodeFromInsee(row.inseeCode),
          departmentAveragePricePerM2: null,
        };
        continue;
      }

      existing.priceHistory.push(pricePoint);
      existing.priceHistory.sort((a, b) => a.year - b.year);

      if (row.year >= existing.year) {
        existing.year = row.year;
        existing.averagePricePerM2 = row.averagePricePerM2;
        existing.averageTransactionPrice = row.averageTransactionPrice;
        existing.mutationCount = row.mutationCount;
        existing.houseMutations = row.houseMutations;
        existing.apartmentMutations = row.apartmentMutations;
        existing.houseSharePercent = row.houseSharePercent;
        existing.apartmentSharePercent = row.apartmentSharePercent;
      }
    }
  }

  return computeDepartmentAverages(cache);
}

async function main(): Promise<void> {
  const cache = await aggregateProperty();
  writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`\n✅ Cache DVF généré : ${OUTPUT_PATH}`);
  console.log(`   Communes indexées : ${Object.keys(cache).length}`);
}

main().catch((error: unknown) => {
  console.error("Erreur ingestion DVF :", error);
  process.exit(1);
});
