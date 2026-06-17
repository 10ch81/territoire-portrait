import type { DataSource } from "./types";

const GEO_API_BASE = "https://geo.api.gouv.fr";

export const SOURCE_IDS = {
  GEO_API_COMMUNES: "geo-api-communes",
  GEO_API_DEPARTEMENTS: "geo-api-departements",
  GEO_API_REGIONS: "geo-api-regions",
} as const;

export function createGeoApiSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.GEO_API_COMMUNES,
    name: "API Géo — Communes",
    url: `${GEO_API_BASE}/communes`,
    description:
      "Référentiel officiel des communes françaises (nom, code INSEE, population, coordonnées).",
    accessedAt,
  };
}

export const PLANNED_SOURCES: DataSource[] = [
  {
    id: "insee-population",
    name: "INSEE — Populations légales",
    url: "https://www.data.gouv.fr/fr/datasets/populations-legales/",
    description: "Population officielle par commune (à intégrer via ingestion future).",
    accessedAt: "",
  },
  {
    id: "ban-adresses",
    name: "Base Adresse Nationale",
    url: "https://adresse.data.gouv.fr/",
    description: "Géolocalisation et adresses (exploration MCP data.gouv.fr).",
    accessedAt: "",
  },
  {
    id: "sirene-entreprises",
    name: "SIRENE — Entreprises",
    url: "https://www.data.gouv.fr/fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/",
    description: "Établissements et entreprises par territoire (ingestion future).",
    accessedAt: "",
  },
];

export function formatSourceLabel(source: DataSource): string {
  return `${source.name} — ${source.url}`;
}
