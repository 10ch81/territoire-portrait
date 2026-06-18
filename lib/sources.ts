import type { DataSource } from "./types";

const GEO_API_BASE = "https://geo.api.gouv.fr";
const ENTREPRISES_API_BASE = "https://recherche-entreprises.api.gouv.fr";
const BPE_DATASET_URL =
  "https://www.data.gouv.fr/datasets/denombrement-des-equipements-commerce-sport-services-sante/";
const BPE_FILE_URL =
  "https://api.insee.fr/melodi/file/DS_BPE/DS_BPE_2024_CSV_FR";
const POPULATION_HISTORY_URL =
  "https://api.insee.fr/melodi/file/DS_POPULATIONS_HISTORIQUES/DS_POPULATIONS_HISTORIQUES_CSV_FR";
const GEORISQUES_URL = "https://georisques.gouv.fr/";
const RPLS_URL =
  "https://www.data.gouv.fr/datasets/repertoire-des-logements-locatifs-des-bailleurs-sociaux-rpls-2021/";
const IRVE_URL =
  "https://www.data.gouv.fr/datasets/base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques/";
const REI_URL =
  "https://www.data.gouv.fr/datasets/impots-locaux-fichier-de-recensement-des-elements-dimposition-a-la-fiscalite-directe-locale-rei-4/";
const AAV_URL =
  "https://www.data.gouv.fr/datasets/zonage-en-aires-dattraction-des-villes-france-entiere-enrichi-zaav-2020/";
const DVF_URL =
  "https://www.data.gouv.fr/datasets/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2024/";
const COMMUTE_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8200836/TD_NAV2A_2021_csv.zip";
const QPV_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8186239/TAG_QPV2024_2025_csv.zip";
const GTFS_API_URL = "https://transport.data.gouv.fr/api/datasets";

const SSMSI_URL =
  "https://www.data.gouv.fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales";

export const SOURCE_IDS = {
  GEO_API_COMMUNES: "geo-api-communes",
  RECHERCHE_ENTREPRISES: "recherche-entreprises",
  INSEE_BPE: "insee-bpe",
  INSEE_POPULATION: "insee-population",
  INSEE_POPULATION_HISTORY: "insee-population-history",
  INSEE_RP_POPULATION: "insee-rp-population",
  INSEE_RP_EMPLOYMENT: "insee-rp-employment",
  INSEE_RP_HOUSING: "insee-rp-housing",
  INSEE_RP_COMMUTE: "insee-rp-commute",
  INSEE_FILOSOFI: "insee-filosofi",
  GEORISQUES: "georisques",
  RPLS: "rpls",
  IRVE: "irve",
  GTFS: "gtfs-transport",
  QPV: "qpv-sig-ville",
  REI: "rei",
  AAV: "aav2020",
  DVF: "dvf",
  SSMSI: "ssmsi",
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

export function createPopulationHistorySource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_POPULATION_HISTORY,
    name: "INSEE — Populations historiques",
    url: POPULATION_HISTORY_URL,
    description: "Séries historiques de population municipale par commune.",
    accessedAt,
  };
}

export function createRpPopulationSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_RP_POPULATION,
    name: "INSEE — Recensement 2021 (structure par âge)",
    url: "https://www.insee.fr/fr/statistiques/8201904",
    description: "Structure par tranches d'âge de la population communale (RP 2021).",
    accessedAt,
  };
}

export function createRpEmploymentSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_RP_EMPLOYMENT,
    name: "INSEE — Recensement 2021 (emploi)",
    url: "https://www.insee.fr/fr/statistiques/8202916",
    description: "Population active et chômage au recensement 2021.",
    accessedAt,
  };
}

export function createFilosofiSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_FILOSOFI,
    name: "INSEE — FILOSOFI (revenus)",
    url: "https://www.insee.fr/fr/metadonnees/source/operation/s2146/presentation",
    description: "Revenu médian disponible par unité de consommation (FILOSOFI).",
    accessedAt,
  };
}

export function createGeorisquesSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.GEORISQUES,
    name: "Géorisques",
    url: GEORISQUES_URL,
    description: "Radon, inondations (AZI) et reconnaissances CATNAT par commune.",
    accessedAt,
  };
}

export function createRplsSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.RPLS,
    name: "RPLS — Parc locatif social",
    url: RPLS_URL,
    description: "Répertoire des logements locatifs des bailleurs sociaux agrégé par commune.",
    accessedAt,
  };
}

export function createIrveSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.IRVE,
    name: "IRVE — Bornes de recharge",
    url: IRVE_URL,
    description: "Fichier consolidé national des bornes de recharge pour véhicules électriques.",
    accessedAt,
  };
}

export function createReiSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.REI,
    name: "REI — Fiscalité locale",
    url: REI_URL,
    description:
      "Recensement des éléments d'imposition à la fiscalité directe locale (taux communaux).",
    accessedAt,
  };
}

export function createAavSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.AAV,
    name: "INSEE — Aires d'attraction 2020",
    url: AAV_URL,
    description: "Zonage en aires d'attraction des villes (AAV2020) par commune.",
    accessedAt,
  };
}

export function createDvfSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.DVF,
    name: "DVF — Indicateurs immobiliers",
    url: DVF_URL,
    description: "Prix et volumes de mutations immobilières agrégés par commune.",
    accessedAt,
  };
}

export function createSsmsiSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.SSMSI,
    name: "SSMSI — Délinquance enregistrée",
    url: SSMSI_URL,
    description:
      "Principaux indicateurs de crimes et délits enregistrés par la police et la gendarmerie (lieu de commission).",
    accessedAt,
  };
}

export function createRpHousingSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_RP_HOUSING,
    name: "INSEE — RP 2021 logement",
    url: "https://www.insee.fr/fr/statistiques/8202349",
    description: "Parc de logements et vacance générale au recensement 2021.",
    accessedAt,
  };
}

export function createCommuteSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_RP_COMMUTE,
    name: "INSEE — RP 2021 mobilité domicile-travail",
    url: COMMUTE_URL,
    description:
      "Modes de transport principal des actifs occupés de 15 ans ou plus (recensement 2021).",
    accessedAt,
  };
}

export function createGtfsSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.GTFS,
    name: "transport.data.gouv.fr — GTFS",
    url: GTFS_API_URL,
    description:
      "Arrêts de transport collectif agrégés depuis les flux GTFS français (transport.data.gouv.fr).",
    accessedAt,
  };
}

export function createQpvSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.QPV,
    name: "INSEE / SIG Ville — QPV 2024",
    url: QPV_URL,
    description:
      "Quartiers prioritaires de la politique de la ville (table d'appartenance géographique 2025).",
    accessedAt,
  };
}

export const BPE_MMELODI_FILE_URL = BPE_FILE_URL;

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
