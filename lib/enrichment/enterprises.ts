import { createEnterpriseSource } from "../sources";
import { loadJsonCache } from "./cache";
import type { EnterpriseSideCommuneCache, EnterpriseSnapshot } from "../types";

const ENTERPRISE_API_BASE = "https://recherche-entreprises.api.gouv.fr/search";
const ENTERPRISE_API_MAX_PAGES = 400;
const ENTERPRISE_API_MAX_RESULTS = 10_000;

interface EnterpriseSearchResponse {
  total_results?: number;
  total_pages?: number;
}

interface EnterpriseTotalResult {
  total: number | null;
  isCapped: boolean;
}

async function fetchEnterpriseTotal(
  inseeCode: string,
  filters: Record<string, string> = {},
): Promise<EnterpriseTotalResult | null> {
  const params = new URLSearchParams({
    code_commune: inseeCode,
    etat_administratif: "A",
    page: "1",
    per_page: "1",
    ...filters,
  });

  const response = await fetch(`${ENTERPRISE_API_BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    console.error("Erreur API entreprises:", response.status);
    return null;
  }

  const data = (await response.json()) as EnterpriseSearchResponse;
  const total = data.total_results ?? null;
  const totalPages = data.total_pages ?? 0;
  const isCapped =
    total !== null &&
    total >= ENTERPRISE_API_MAX_RESULTS &&
    totalPages >= ENTERPRISE_API_MAX_PAGES;

  return { total, isCapped };
}

const ENTERPRISE_SIDE_CACHE_FILE = "enterprise-side-by-commune.json";

function loadInseeSideCounts(inseeCode: string): {
  legalUnits: number | null;
  establishments: number | null;
  year: number | null;
} {
  const cache = loadJsonCache<EnterpriseSideCommuneCache>(ENTERPRISE_SIDE_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return { legalUnits: null, establishments: null, year: null };
  }

  return {
    legalUnits: entry.legalUnits,
    establishments: entry.establishments,
    year: entry.year,
  };
}

export async function fetchEnterpriseSnapshot(
  inseeCode: string,
): Promise<EnterpriseSnapshot | null> {
  const [base, ess, rge] = await Promise.all([
    fetchEnterpriseTotal(inseeCode),
    fetchEnterpriseTotal(inseeCode, { est_ess: "true" }),
    fetchEnterpriseTotal(inseeCode, { est_rge: "true" }),
  ]);

  const side = loadInseeSideCounts(inseeCode);

  if (!base && side.legalUnits === null) {
    return null;
  }

  const noteParts = [
    "Unités légales ayant au moins un établissement actif sur la commune (API SIRENE).",
    "Comptages ESS et RGE issus de l'API (filtres dédiés).",
  ];

  if (side.legalUnits !== null) {
    noteParts.push(
      `Stocks INSEE SIDE (${side.year}) : unités légales et étabissements actifs sur la commune.`,
    );
  }

  if (base?.isCapped) {
    noteParts.push(
      `Le total SIRENE est plafonné à ${ENTERPRISE_API_MAX_RESULTS.toLocaleString("fr-FR")} par l'API : la commune peut en compter davantage.`,
    );
  }

  return {
    legalUnitsWithEstablishment: base?.total ?? null,
    legalUnitsIsCapped: base?.isCapped ?? false,
    essCount: ess?.total ?? null,
    rgeCount: rge?.total ?? null,
    inseeLegalUnits: side.legalUnits,
    inseeEstablishments: side.establishments,
    inseeSideYear: side.year,
    millesime: side.year ? `${side.year} / 2024-2025` : "2024-2025",
    note: noteParts.join(" "),
  };
}

export { createEnterpriseSource };
