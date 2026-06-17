import type { DataSource } from "./types";

const GEO_API_BASE = "https://geo.api.gouv.fr";
const ENTREPRISES_API_BASE = "https://recherche-entreprises.api.gouv.fr";
const BPE_DATASET_URL =
  "https://www.data.gouv.fr/datasets/denombrement-des-equipements-commerce-sport-services-sante/";
const BPE_FILE_URL =
  "https://api.insee.fr/melodi/file/DS_BPE/DS_BPE_2024_CSV_FR";

export const SOURCE_IDS = {
  GEO_API_COMMUNES: "geo-api-communes",
  RECHERCHE_ENTREPRISES: "recherche-entreprises",
  INSEE_BPE: "insee-bpe",
  INSEE_POPULATION: "insee-population",
} as const;

export function createGeoApiSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.GEO_API_COMMUNES,
    name: "API Géo — Communes",
    url: `${GEO_API_BASE}/communes`,
    description:
      "Référentiel officiel des communes françaises (nom, code INSEE, population, EPCI, coordonnées).",
    accessedAt,
  };
}

export function createEnterpriseSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.RECHERCHE_ENTREPRISES,
    name: "API Recherche Entreprises (SIRENE)",
    url: ENTREPRISES_API_BASE,
    description:
      "Entreprises et établissements recensés via la base SIRENE (data.gouv.fr).",
    accessedAt,
  };
}

export function createBpeSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_BPE,
    name: "INSEE — Base permanente des équipements (BPE 2024)",
    url: BPE_DATASET_URL,
    description:
      "Dénombrement des équipements et services accessibles à la population par commune.",
    accessedAt,
  };
}

export function createPopulationSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_POPULATION,
    name: "INSEE — Populations légales (via API Géo)",
    url: "https://www.data.gouv.fr/fr/datasets/populations-legales/",
    description:
      "Population municipale diffusée via l'API Géo (millésime populations légales).",
    accessedAt,
  };
}

export const BPE_MMELODI_FILE_URL = BPE_FILE_URL;

export const PLANNED_SOURCES: DataSource[] = [
  {
    id: "ban-adresses",
    name: "Base Adresse Nationale",
    url: "https://adresse.data.gouv.fr/",
    description: "Géolocalisation et adresses (exploration MCP data.gouv.fr).",
    accessedAt: "",
  },
];

export function formatSourceLabel(source: DataSource): string {
  return `${source.name} — ${source.url}`;
}

export function mergeSources(...groups: DataSource[][]): DataSource[] {
  const seen = new Set<string>();
  const merged: DataSource[] = [];

  for (const group of groups) {
    for (const source of group) {
      if (seen.has(source.id)) {
        continue;
      }
      seen.add(source.id);
      merged.push(source);
    }
  }

  return merged;
}
