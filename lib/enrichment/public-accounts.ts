import { createOfglSource } from "../sources";
import type { PublicAccountsSnapshot } from "../types";

const OFGL_API_BASE =
  "https://data.ofgl.fr/api/explore/v2.1/catalog/datasets/ofgl-base-communes/records";

const KEY_AGGREGATES = ["Encours de dette", "Recettes de fonctionnement"] as const;

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

export async function fetchPublicAccountsSnapshot(
  inseeCode: string,
): Promise<PublicAccountsSnapshot | null> {
  const where = [
    `insee='${inseeCode}'`,
    "type_de_budget='Budget principal'",
    `agregat IN (${KEY_AGGREGATES.map((label) => `'${label}'`).join(",")})`,
  ].join(" AND ");

  const url = `${OFGL_API_BASE}?where=${encodeURIComponent(where)}&order_by=exer DESC&limit=20`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      console.error("Erreur API OFGL:", response.status);
      return {
        year: new Date().getFullYear() - 1,
        operatingRevenueEur: null,
        operatingRevenuePerCapitaEur: null,
        debtOutstandingEur: null,
        debtPerCapitaEur: null,
        available: false,
        note: `Comptes publics OFGL indisponibles (erreur API ${response.status}).`,
      };
    }

    const data = (await response.json()) as OfglResponse;
    const results = data.results ?? [];

    if (results.length === 0) {
      return {
        year: new Date().getFullYear() - 1,
        operatingRevenueEur: null,
        operatingRevenuePerCapitaEur: null,
        debtOutstandingEur: null,
        debtPerCapitaEur: null,
        available: false,
        note: "Comptes publics OFGL non disponibles pour cette commune.",
      };
    }

    const latestYear = parseYear(results[0]?.exer) ?? new Date().getFullYear() - 1;
    const latestRows = results.filter((row) => parseYear(row.exer) === latestYear);

    const debt = latestRows.find((row) => row.agregat === "Encours de dette");
    const revenue = latestRows.find(
      (row) => row.agregat === "Recettes de fonctionnement",
    );

    return {
      year: latestYear,
      operatingRevenueEur: revenue?.montant ?? null,
      operatingRevenuePerCapitaEur: revenue?.euros_par_habitant ?? null,
      debtOutstandingEur: debt?.montant ?? null,
      debtPerCapitaEur: debt?.euros_par_habitant ?? null,
      available: Boolean(debt || revenue),
      note:
        "Encours de dette et recettes de fonctionnement (budget principal), source OFGL — dernier exercice disponible.",
    };
  } catch (error) {
    console.error("Erreur réseau OFGL:", error);
    return {
      year: new Date().getFullYear() - 1,
      operatingRevenueEur: null,
      operatingRevenuePerCapitaEur: null,
      debtOutstandingEur: null,
      debtPerCapitaEur: null,
      available: false,
      note: "Comptes publics OFGL indisponibles (erreur réseau).",
    };
  }
}

export { createOfglSource };
