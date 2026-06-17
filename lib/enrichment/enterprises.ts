import { createEnterpriseSource } from "../sources";
import type {
  ActivitySectionCount,
  EnterpriseSnapshot,
  StaffSizeBandCount,
} from "../types";

const ENTERPRISE_SAMPLE_PAGES = 4;
const ENTERPRISE_PER_PAGE = 25;

const NAF_SECTION_LABELS: Record<string, string> = {
  A: "Agriculture, sylviculture et pêche",
  B: "Industries extractives",
  C: "Industrie manufacturière",
  D: "Énergie",
  E: "Eau, déchets, dépollution",
  F: "Construction",
  G: "Commerce et réparation",
  H: "Transports et entreposage",
  I: "Hébergement et restauration",
  J: "Information et communication",
  K: "Activités financières et d'assurance",
  L: "Activités immobilières",
  M: "Activités scientifiques et techniques",
  N: "Services administratifs et de soutien",
  O: "Administration publique",
  P: "Enseignement",
  Q: "Santé humaine et action sociale",
  R: "Arts, spectacles et activités récréatives",
  S: "Autres activités de services",
  T: "Activités des ménages",
  U: "Activités extra-territoriales",
};

const STAFF_SIZE_LABELS: Record<string, string> = {
  NN: "Non renseigné",
  "00": "0 salarié",
  "01": "1 à 2 salariés",
  "02": "3 à 5 salariés",
  "03": "6 à 9 salariés",
  "11": "10 à 19 salariés",
  "12": "20 à 49 salariés",
  "21": "50 à 99 salariés",
  "22": "100 à 199 salariés",
  "31": "200 à 249 salariés",
  "32": "250 à 499 salariés",
  "41": "500 à 999 salariés",
  "42": "1 000 à 1 999 salariés",
  "51": "2 000 à 4 999 salariés",
  "52": "5 000 à 9 999 salariés",
  "53": "10 000 salariés ou plus",
};

interface EnterpriseSearchResponse {
  total_results?: number;
  results?: Array<{
    section_activite_principale?: string;
    est_ess?: boolean;
    tranche_effectif_salarie?: string;
    complements?: {
      est_rge?: boolean;
    };
  }>;
}

async function fetchEnterprisePage(
  inseeCode: string,
  page: number,
): Promise<EnterpriseSearchResponse | null> {
  const params = new URLSearchParams({
    code_commune: inseeCode,
    etat_administratif: "A",
    page: String(page),
    per_page: String(ENTERPRISE_PER_PAGE),
    minimal: "true",
  });

  const response = await fetch(
    `https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    },
  );

  if (!response.ok) {
    console.error("Erreur API entreprises:", response.status);
    return null;
  }

  return (await response.json()) as EnterpriseSearchResponse;
}

export async function fetchEnterpriseSnapshot(
  inseeCode: string,
): Promise<EnterpriseSnapshot | null> {
  const pages = await Promise.all(
    Array.from({ length: ENTERPRISE_SAMPLE_PAGES }, (_, index) =>
      fetchEnterprisePage(inseeCode, index + 1),
    ),
  );

  const firstPage = pages[0];
  if (!firstPage) {
    return null;
  }

  const sectionCounts = new Map<string, number>();
  const staffCounts = new Map<string, number>();
  let sampleSize = 0;
  let essCount = 0;
  let rgeCount = 0;

  for (const page of pages) {
    for (const result of page?.results ?? []) {
      sampleSize += 1;

      const section = result.section_activite_principale;
      if (section) {
        sectionCounts.set(section, (sectionCounts.get(section) ?? 0) + 1);
      }

      if (result.est_ess) {
        essCount += 1;
      }

      if (result.complements?.est_rge) {
        rgeCount += 1;
      }

      const staffBand = result.tranche_effectif_salarie;
      if (staffBand) {
        staffCounts.set(staffBand, (staffCounts.get(staffBand) ?? 0) + 1);
      }
    }
  }

  const topActivitySections: ActivitySectionCount[] = [...sectionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({
      code,
      label: NAF_SECTION_LABELS[code] ?? code,
      count,
    }));

  const staffSizeBands: StaffSizeBandCount[] = [...staffCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({
      code,
      label: STAFF_SIZE_LABELS[code] ?? code,
      count,
    }));

  return {
    legalUnitsWithEstablishment: firstPage.total_results ?? null,
    sampleSize,
    topActivitySections,
    essCount: sampleSize > 0 ? essCount : null,
    rgeCount: sampleSize > 0 ? rgeCount : null,
    staffSizeBands,
    millesime: "2024-2025",
    note:
      "Unités légales ayant au moins un établissement actif sur la commune. " +
      "ESS, RGE et tranches d'effectif calculés sur un échantillon des premiers résultats.",
  };
}

export { createEnterpriseSource };
