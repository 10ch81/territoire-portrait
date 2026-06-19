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
const FRANCE_SERVICES_DATASET_URL =
  "https://www.data.gouv.fr/datasets/liste-des-structures-labellisees-france-services/";
const OFGL_URL = "https://data.ofgl.fr/";
const SIDE_URL = "https://www.insee.fr/fr/statistiques/2011101";
const TOURISM_URL =
  "https://www.insee.fr/fr/statistiques/fichier/2021703/DS_TOUR_CAP_CSV_2025_geo25.zip";
const FLORES_URL =
  "https://www.data.gouv.fr/datasets/nombre-detablissements-et-effectifs-salaries-en-17-grands-secteurs/";
const FLORES_FILE_URL =
  "https://api.insee.fr/melodi/file/DS_FLORES_A17/DS_FLORES_A17_2024_CSV_FR";
const ARCEP_URL = "https://www.data.gouv.fr/datasets/ma-connexion-internet/";
const FINESS_URL = "https://www.data.gouv.fr/datasets/reexposition-des-donnees-finess/";
const EDUCATION_URL = "https://www.data.gouv.fr/datasets/annuaire-de-leducation/";

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
  QPV: "qpv-sig-ville",
  REI: "rei",
  OFGL: "ofgl",
  FRANCE_SERVICES: "france-services",
  INSEE_SIDE: "insee-side",
  INSEE_TOURISM: "insee-tourism",
  INSEE_FLORES: "insee-flores",
  ARCEP_FIBRE: "arcep-fibre",
  FINESS: "finess",
  EDUCATION_DIRECTORY: "education-directory",
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
    description:
      "Prix et volumes de mutations immobilières agrégés par commune (hors Alsace-Moselle et Mayotte).",
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

export function createOfglSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.OFGL,
    name: "OFGL — Comptes des collectivités",
    url: OFGL_URL,
    description:
      "Encours de dette et recettes de fonctionnement des communes (budget principal).",
    accessedAt,
  };
}

export function createFranceServicesSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.FRANCE_SERVICES,
    name: "France Services — Structures labellisées",
    url: FRANCE_SERVICES_DATASET_URL,
    description: "Points d'accueil France Services labellisés par commune.",
    accessedAt,
  };
}

export function createInseeSideSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_SIDE,
    name: "INSEE — SIDE (stocks d'entreprises)",
    url: SIDE_URL,
    description:
      "Stocks d'unités légales et d'étabissements actifs par commune (SIDE).",
    accessedAt,
  };
}

export function createTourismSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_TOURISM,
    name: "INSEE — Capacités touristiques",
    url: TOURISM_URL,
    description: "Places d'hébergement touristique par commune.",
    accessedAt,
  };
}

export function createFloresSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_FLORES,
    name: "INSEE — FLORES (emploi salarié A17)",
    url: FLORES_URL,
    description:
      "Établissements actifs et postes salariés fin d'année par secteur A17 (commune).",
    accessedAt,
  };
}

export function createArcepSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.ARCEP_FIBRE,
    name: "ARCEP — Ma connexion internet",
    url: ARCEP_URL,
    description:
      "Couverture fibre et technologies d'accès internet fixe par commune.",
    accessedAt,
  };
}

export function createFinessSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.FINESS,
    name: "FINESS — Établissements sanitaires et sociaux",
    url: FINESS_URL,
    description:
      "Référentiel national des établissements sanitaires, sociaux et médico-sociaux.",
    accessedAt,
  };
}

export function createEducationSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.EDUCATION_DIRECTORY,
    name: "Annuaire de l'Éducation",
    url: EDUCATION_URL,
    description: "Établissements scolaires ouverts par commune.",
    accessedAt,
  };
}

export const FLORES_MMELODI_FILE_URL = FLORES_FILE_URL;

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
