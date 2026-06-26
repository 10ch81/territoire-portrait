import { departmentCodeFromInsee } from "./indicators/department-code";
import type { AplCommuneCacheEntry } from "./types";

export const APL_GENERAL_PRACTITIONER_XLSX_URL =
  "https://data.drees.solidarites-sante.gouv.fr/api/v2/catalog/datasets/530_l-accessibilite-potentielle-localisee-apl/attachments/indicateur_d_accessibilite_potentielle_localisee_apl_aux_medecins_generalistes_xlsx";

/** Dernier millésime APL ingéré (feuille « APL YYYY » la plus récente). */
export const APL_VINTAGE = 2023;

export const APL_GENERAL_PRACTITIONER_NOTE =
  "Indicateur d'accessibilité potentielle localisée (APL) DREES : consultations ou visites de médecine générale accessibles par habitant standardisé, compte tenu de l'offre des communes voisines et de la structure par âge. Ne mesure pas les délais de rendez-vous ni l'acceptation de nouveaux patients.";

type SheetRow = Array<string | number>;

function parseNumericCell(value: string | number | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) {
      return null;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeInseeCode(raw: string | number | undefined): string | null {
  const text = String(raw ?? "").trim();
  if (!text) {
    return null;
  }

  if (/^2[AB]\d{3}$/i.test(text)) {
    return text.toUpperCase();
  }

  if (/^\d{1,5}$/.test(text)) {
    return text.padStart(5, "0");
  }

  return null;
}

export function findLatestAplSheetName(sheetNames: string[]): string | null {
  const years = sheetNames
    .map((name) => {
      const match = /^APL (\d{4})$/.exec(name.trim());
      return match ? Number.parseInt(match[1] ?? "", 10) : null;
    })
    .filter((year): year is number => year !== null);

  if (years.length === 0) {
    return null;
  }

  const latestYear = Math.max(...years);
  return `APL ${latestYear}`;
}

export function findAplHeaderRowIndex(rows: SheetRow[]): number {
  return rows.findIndex((row) => String(row[0] ?? "").trim() === "Code commune INSEE");
}

export function parseAplGeneralPractitionerRows(
  rows: SheetRow[],
  year: number,
): Record<string, AplCommuneCacheEntry> {
  const headerIndex = findAplHeaderRowIndex(rows);
  if (headerIndex < 0) {
    throw new Error("En-tête APL introuvable (Code commune INSEE).");
  }

  const communes: Record<string, AplCommuneCacheEntry> = {};

  for (const row of rows.slice(headerIndex + 2)) {
    const inseeCode = normalizeInseeCode(row[0]);
    const value = parseNumericCell(row[2]);
    if (!inseeCode || value === null) {
      continue;
    }

    communes[inseeCode] = {
      generalPractitioner: {
        year,
        value: roundTwoDecimals(value)!,
        valueUnder65: roundTwoDecimals(parseNumericCell(row[3])),
        standardizedPopulation: parseNumericCell(row[6]) ?? 0,
        referencePopulation: parseNumericCell(row[7]) ?? 0,
      },
    };
  }

  return communes;
}

function roundTwoDecimals(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

export function computeDepartmentMedians(
  communes: Record<string, AplCommuneCacheEntry>,
): Record<string, number> {
  const byDepartment = new Map<string, number[]>();

  for (const [inseeCode, entry] of Object.entries(communes)) {
    const departmentCode = departmentCodeFromInsee(inseeCode);
    const values = byDepartment.get(departmentCode) ?? [];
    values.push(entry.generalPractitioner.value);
    byDepartment.set(departmentCode, values);
  }

  const medians: Record<string, number> = {};
  for (const [departmentCode, values] of byDepartment.entries()) {
    medians[departmentCode] = roundTwoDecimals(median(values)) ?? 0;
  }

  return medians;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return Number.NaN;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2;
  }

  return sorted[middle]!;
}

export function formatAplConsultations(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value)} consultations / hab. standardisé`;
}
