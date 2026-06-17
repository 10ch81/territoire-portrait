import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createBpeSource,
  createEnterpriseSource,
  mergeSources,
} from "../sources";
import { getTerritoryByInsee } from "../territory";
import type {
  ActivitySectionCount,
  BpeCommuneCache,
  EnterpriseSnapshot,
  EquipmentDomainCount,
  EquipmentSnapshot,
  TerritoryEnrichment,
  TerritoryProfile,
} from "../types";

const BPE_CACHE_PATH = resolve(process.cwd(), "data/cache/bpe-by-commune.json");
const ENTERPRISE_SAMPLE_PAGES = 4;
const ENTERPRISE_PER_PAGE = 25;

const BPE_DOMAIN_LABELS: Record<string, string> = {
  A: "Services pour les particuliers",
  B: "Commerces",
  C: "Enseignement",
  D: "Santé et action sociale",
  E: "Transports et déplacements",
  F: "Sports, loisirs et culture",
  G: "Tourisme",
};

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

interface EnterpriseSearchResponse {
  total_results?: number;
  results?: Array<{
    section_activite_principale?: string;
    est_ess?: boolean;
  }>;
}

let bpeCache: BpeCommuneCache | null | undefined;

function loadBpeCache(): BpeCommuneCache | null {
  if (bpeCache !== undefined) {
    return bpeCache;
  }

  if (!existsSync(BPE_CACHE_PATH)) {
    bpeCache = null;
    return null;
  }

  try {
    bpeCache = JSON.parse(readFileSync(BPE_CACHE_PATH, "utf-8")) as BpeCommuneCache;
    return bpeCache;
  } catch (error) {
    console.error("Impossible de lire le cache BPE:", error);
    bpeCache = null;
    return null;
  }
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
  let sampleSize = 0;
  let essCount = 0;

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

  return {
    legalUnitsWithEstablishment: firstPage.total_results ?? null,
    sampleSize,
    topActivitySections,
    essCount: sampleSize > 0 ? essCount : null,
    millesime: "2024-2025",
    note:
      "Unités légales ayant au moins un établissement actif sur la commune. " +
      "Répartition sectorielle calculée sur un échantillon des premiers résultats.",
  };
}

export function loadEquipmentSnapshot(
  inseeCode: string,
): EquipmentSnapshot | null {
  const cache = loadBpeCache();
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2024,
      totalEquipments: 0,
      byDomain: [],
      available: false,
      note:
        "Cache BPE absent. Exécutez « npm run ingest:bpe » pour activer les données d'équipements.",
    };
  }

  const byDomain: EquipmentDomainCount[] = Object.entries(entry.byDomain)
    .map(([code, count]) => ({
      code,
      label: BPE_DOMAIN_LABELS[code] ?? code,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    year: entry.year,
    totalEquipments: entry.total,
    byDomain,
    available: true,
    note: "Dénombrement INSEE BPE 2024 par domaine d'équipements (commune).",
  };
}

export async function enrichTerritory(
  territory: TerritoryProfile,
): Promise<TerritoryProfile> {
  const accessedAt = new Date().toISOString();

  const [enterprises, equipments] = await Promise.all([
    fetchEnterpriseSnapshot(territory.inseeCode),
    Promise.resolve(loadEquipmentSnapshot(territory.inseeCode)),
  ]);

  const enrichmentSources = [];
  if (enterprises) {
    enrichmentSources.push(createEnterpriseSource(accessedAt));
  }
  if (equipments?.available) {
    enrichmentSources.push(createBpeSource(accessedAt));
  }

  const enrichment: TerritoryEnrichment = {
    enterprises,
    equipments,
    sources: enrichmentSources,
  };

  return {
    ...territory,
    sources: mergeSources(territory.sources, enrichmentSources),
    enrichment,
  };
}

export async function getEnrichedTerritoryByInsee(
  inseeCode: string,
): Promise<TerritoryProfile | null> {
  const territory = await getTerritoryByInsee(inseeCode);

  if (!territory) {
    return null;
  }

  return enrichTerritory(territory);
}

export function formatDensity(densityPerKm2: number | null): string {
  if (densityPerKm2 === null) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(densityPerKm2)} hab./km²`;
}
