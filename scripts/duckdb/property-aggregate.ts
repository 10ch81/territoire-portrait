import type { DuckDBConnection } from "@duckdb/node-api";
import type { PropertyCommuneCache, PropertyYearPrice } from "@/lib/types";
import { sqlReadCommaCsvUrl } from "./read-csv-sql";

const LATEST_YEAR = 2024;

export const DVF_SOURCES: Array<{ year: number; url: string; legacy: boolean }> = [
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

function parseFrenchDecimal(value: unknown): number | null {
  const normalized = String(value ?? "").replace(",", ".").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalInt(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function departmentCodeFromInsee(inseeCode: string): string {
  if (inseeCode.startsWith("97") || inseeCode.startsWith("98")) {
    return inseeCode.slice(0, 3);
  }

  return inseeCode.slice(0, 2);
}

function mapLegacyDvfRow(row: Record<string, unknown>): DvfRow | null {
  const inseeCode = String(row.column1 ?? "");
  const year = Number.parseInt(String(row.column2 ?? ""), 10);
  if (!inseeCode || Number.isNaN(year)) {
    return null;
  }

  return {
    inseeCode,
    year,
    mutationCount: parseOptionalInt(row.column3),
    houseMutations: parseOptionalInt(row.column4),
    apartmentMutations: parseOptionalInt(row.column5),
    houseSharePercent: parseFrenchDecimal(row.column6),
    apartmentSharePercent: parseFrenchDecimal(row.column7),
    averageTransactionPrice: parseFrenchDecimal(row.column8),
    averagePricePerM2: parseFrenchDecimal(row.column9),
  };
}

function mapModernDvfRow(row: Record<string, unknown>): DvfRow | null {
  const inseeCode = String(row.INSEE_COM ?? "");
  const year = Number.parseInt(String(row.annee ?? ""), 10);
  if (!inseeCode || Number.isNaN(year)) {
    return null;
  }

  return {
    inseeCode,
    year,
    mutationCount: parseOptionalInt(row.nb_mutations),
    houseMutations: parseOptionalInt(row.NbMaisons),
    apartmentMutations: parseOptionalInt(row.NbApparts),
    houseSharePercent: parseFrenchDecimal(row.PropMaison),
    apartmentSharePercent: parseFrenchDecimal(row.PropAppart),
    averageTransactionPrice: parseFrenchDecimal(row.PrixMoyen),
    averagePricePerM2: parseFrenchDecimal(row.Prixm2Moyen),
  };
}

async function loadDvfSource(
  connection: DuckDBConnection,
  source: (typeof DVF_SOURCES)[number],
): Promise<DvfRow[]> {
  const csv = sqlReadCommaCsvUrl(source.url, !source.legacy);
  const reader = await connection.runAndReadAll(`SELECT * FROM ${csv}`);
  const rows: DvfRow[] = [];

  for (const row of reader.getRowObjectsJson()) {
    const mapped = source.legacy ? mapLegacyDvfRow(row) : mapModernDvfRow(row);
    if (mapped) {
      rows.push(mapped);
    }
  }

  return rows;
}

function mergeDvfRow(cache: PropertyCommuneCache, row: DvfRow): void {
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
    return;
  }

  existing.priceHistory.push(pricePoint);
  existing.priceHistory.sort((left, right) => left.year - right.year);

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

function computeDepartmentAverages(cache: PropertyCommuneCache): PropertyCommuneCache {
  const departmentTotals = new Map<string, { weightedSum: number; weight: number }>();

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

export async function aggregatePropertyCommuneCache(
  connection: DuckDBConnection,
): Promise<PropertyCommuneCache> {
  const cache: PropertyCommuneCache = {};

  for (const source of DVF_SOURCES) {
    const rows = await loadDvfSource(connection, source);
    for (const row of rows) {
      mergeDvfRow(cache, row);
    }
  }

  return computeDepartmentAverages(cache);
}
