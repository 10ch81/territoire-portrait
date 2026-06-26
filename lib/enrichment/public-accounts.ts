import { createOfglSource } from "../sources";
import type { PublicAccountsSnapshot } from "../types";

const OFGL_API_BASE =
  "https://data.ofgl.fr/api/explore/v2.1/catalog/datasets/ofgl-base-communes/records";

const KEY_AGGREGATES = [
  "Encours de dette",
  "Recettes de fonctionnement",
  "Epargne brute",
  "Annuité de la dette",
] as const;

interface OfglRecord {
  exer?: string;
  agregat?: string;
  montant?: number;
  euros_par_habitant?: number;
}

interface OfglResponse {
  results?: OfglRecord[];
}

function parseYear(value: string | undefined): number | null {
  const year = Number.parseInt(value ?? "", 10);
  return Number.isFinite(year) ? year : null;
}

function emptyPublicAccountsSnapshot(
  year: number,
  note: string,
  available = false,
): PublicAccountsSnapshot {
  return {
    year,
    operatingRevenueEur: null,
    operatingRevenuePerCapitaEur: null,
    debtOutstandingEur: null,
    debtPerCapitaEur: null,
    grossSavingsEur: null,
    grossSavingsPerCapitaEur: null,
    debtServiceEur: null,
    debtServicePerCapitaEur: null,
    available,
    note,
  };
}

export function resolvePublicAccountsAmountEur(
  totalEur: number | null,
  perCapitaEur: number | null,
  population: number | null,
): number | null {
  if (totalEur !== null) {
    return totalEur;
  }

  if (
    perCapitaEur !== null &&
    population !== null &&
    population > 0
  ) {
    return perCapitaEur * population;
  }

  return null;
}

export function computeDebtPaybackYears(
  debtOutstandingEur: number | null,
  grossSavingsEur: number | null,
): number | null {
  if (
    debtOutstandingEur === null ||
    grossSavingsEur === null ||
    grossSavingsEur <= 0
  ) {
    return null;
  }

  return debtOutstandingEur / grossSavingsEur;
}

export function computeDebtServiceToRevenuePercent(
  debtServiceEur: number | null,
  operatingRevenueEur: number | null,
): number | null {
  if (
    debtServiceEur === null ||
    operatingRevenueEur === null ||
    operatingRevenueEur <= 0
  ) {
    return null;
  }

  return (debtServiceEur / operatingRevenueEur) * 100;
}

type PublicAccountsRatioInput = Pick<
  PublicAccountsSnapshot,
  | "debtOutstandingEur"
  | "debtPerCapitaEur"
  | "grossSavingsEur"
  | "grossSavingsPerCapitaEur"
  | "debtServiceEur"
  | "debtServicePerCapitaEur"
  | "operatingRevenueEur"
  | "operatingRevenuePerCapitaEur"
>;

/** Ratio dette / épargne — jamais de mélange montant OFGL × population sur un seul agrégat. */
export function computeDebtPaybackYearsFromSnapshot(
  accounts: Pick<
    PublicAccountsRatioInput,
    | "debtOutstandingEur"
    | "debtPerCapitaEur"
    | "grossSavingsEur"
    | "grossSavingsPerCapitaEur"
  >,
): number | null {
  if (
    accounts.debtPerCapitaEur !== null &&
    accounts.grossSavingsPerCapitaEur !== null
  ) {
    return computeDebtPaybackYears(
      accounts.debtPerCapitaEur,
      accounts.grossSavingsPerCapitaEur,
    );
  }

  if (
    accounts.debtOutstandingEur !== null &&
    accounts.grossSavingsEur !== null
  ) {
    return computeDebtPaybackYears(
      accounts.debtOutstandingEur,
      accounts.grossSavingsEur,
    );
  }

  return null;
}

/** Part annuité / recettes — même base (€/hab. ou totaux) des deux côtés. */
export function computeDebtServiceToRevenuePercentFromSnapshot(
  accounts: Pick<
    PublicAccountsRatioInput,
    | "debtServiceEur"
    | "debtServicePerCapitaEur"
    | "operatingRevenueEur"
    | "operatingRevenuePerCapitaEur"
  >,
): number | null {
  if (
    accounts.debtServicePerCapitaEur !== null &&
    accounts.operatingRevenuePerCapitaEur !== null
  ) {
    return computeDebtServiceToRevenuePercent(
      accounts.debtServicePerCapitaEur,
      accounts.operatingRevenuePerCapitaEur,
    );
  }

  if (
    accounts.debtServiceEur !== null &&
    accounts.operatingRevenueEur !== null
  ) {
    return computeDebtServiceToRevenuePercent(
      accounts.debtServiceEur,
      accounts.operatingRevenueEur,
    );
  }

  return null;
}

export async function fetchPublicAccountsSnapshot(
  inseeCode: string,
): Promise<PublicAccountsSnapshot | null> {
  const where = [
    `insee='${inseeCode}'`,
    "type_de_budget='Budget principal'",
    `agregat IN (${KEY_AGGREGATES.map((label) => `'${label}'`).join(",")})`,
  ].join(" AND ");

  const url = `${OFGL_API_BASE}?where=${encodeURIComponent(where)}&order_by=exer DESC&limit=40`;

  const defaultYear = new Date().getFullYear() - 1;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      console.error("Erreur API OFGL:", response.status);
      return emptyPublicAccountsSnapshot(
        defaultYear,
        `Comptes publics OFGL indisponibles (erreur API ${response.status}).`,
      );
    }

    const data = (await response.json()) as OfglResponse;
    const results = data.results ?? [];

    if (results.length === 0) {
      return emptyPublicAccountsSnapshot(
        defaultYear,
        "Comptes publics OFGL non disponibles pour cette commune.",
      );
    }

    const latestYear = parseYear(results[0]?.exer) ?? defaultYear;
    const latestRows = results.filter((row) => parseYear(row.exer) === latestYear);

    const debt = latestRows.find((row) => row.agregat === "Encours de dette");
    const revenue = latestRows.find(
      (row) => row.agregat === "Recettes de fonctionnement",
    );
    const grossSavings = latestRows.find((row) => row.agregat === "Epargne brute");
    const debtService = latestRows.find(
      (row) => row.agregat === "Annuité de la dette",
    );

    return {
      year: latestYear,
      operatingRevenueEur: revenue?.montant ?? null,
      operatingRevenuePerCapitaEur: revenue?.euros_par_habitant ?? null,
      debtOutstandingEur: debt?.montant ?? null,
      debtPerCapitaEur: debt?.euros_par_habitant ?? null,
      grossSavingsEur: grossSavings?.montant ?? null,
      grossSavingsPerCapitaEur: grossSavings?.euros_par_habitant ?? null,
      debtServiceEur: debtService?.montant ?? null,
      debtServicePerCapitaEur: debtService?.euros_par_habitant ?? null,
      available: Boolean(
        debt ||
          revenue ||
          grossSavings ||
          debtService,
      ),
      note:
        "Dette, épargne brute et annuité de la dette (budget principal), source OFGL — dernier exercice disponible.",
    };
  } catch (error) {
    console.error("Erreur réseau OFGL:", error);
    return emptyPublicAccountsSnapshot(
      defaultYear,
      "Comptes publics OFGL indisponibles (erreur réseau).",
    );
  }
}

export { createOfglSource };
