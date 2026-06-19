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
const LOVAC_DATASET_URL =
  "https://www.data.gouv.fr/datasets/logements-vacants-du-parc-prive-par-commune-departement-region-france/";
export const LOVAC_FILE_URL =
  "https://static.data.gouv.fr/resources/logements-vacants-du-parc-prive-lovac-par-commune-departement-region-et-france/20250528-090420/lovac-opendata-communes.csv";
const IRVE_URL =
  "https://www.data.gouv.fr/datasets/base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques/";
const REI_URL =
  "https://www.data.gouv.fr/datasets/impots-locaux-fichier-de-recensement-des-elements-dimposition-a-la-fiscalite-directe-locale-rei-4/";
const AAV_URL =
  "https://www.data.gouv.fr/datasets/zonage-en-aires-dattraction-des-villes-france-entiere-enrichi-zaav-2020/";
const DENSITY_GRID_URL =
  "https://www.insee.fr/fr/information/6439600";
const URBAN_UNIT_URL =
  "https://www.insee.fr/fr/information/4802589";
const PVD_URL =
  "https://www.data.gouv.fr/datasets/programme-petites-villes-de-demain-liste-des-villes-beneficiaires";
const ACV_URL =
  "https://www.data.gouv.fr/datasets/programme-action-coeur-de-ville";
const FRR_URL =
  "https://www.data.gouv.fr/datasets/communes-france-ruralite-revitalisation-frr";
const VILLAGES_AVENIR_URL =
  "https://www.data.gouv.fr/datasets/dispositif-villages-davenir";
const DVF_URL =
  "https://www.data.gouv.fr/datasets/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2024/";
/** Millésime du recensement de la population (bases communales INSEE). */
export const RP_VINTAGE = 2022;

/** Millésime du fichier RPLS (logements sociaux) — distinct du RP communale. */
export const RPLS_VINTAGE = 2021;

/** Millésime LOVAC (vacance parc privé, au 1er janvier). */
export const LOVAC_VINTAGE = 2025;

/** Millésime FILOSOFI (Filosofi 2 à partir de 2023). */
export const FILOSOFI_VINTAGE = 2023;

const FILOSOFI_PAGE_URL = "https://www.insee.fr/fr/statistiques/8984752";

export const FILOSOFI_FILE_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8984752/FILOSOFI_CC_csv.zip";

export const TOURISM_FILE_URL =
  "https://www.insee.fr/fr/statistiques/fichier/2021703/DS_TOUR_CAP_CSV_2025_geo25.zip";

const RP_POPULATION_PAGE_URL = "https://www.insee.fr/fr/statistiques/8581696";
const RP_EMPLOYMENT_PAGE_URL = "https://www.insee.fr/fr/statistiques/8581444";
const RP_HOUSING_PAGE_URL = "https://www.insee.fr/fr/statistiques/8581474";
const RP_COMMUTE_PAGE_URL = "https://www.insee.fr/fr/statistiques/8581610";

export const RP_POPULATION_FILE_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8581696/base-cc-evol-struct-pop-2022_csv.zip";
export const RP_EMPLOYMENT_FILE_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8581444/base-cc-emploi-pop-active-2022_csv.zip";
export const RP_HOUSING_FILE_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8581474/base-cc-logement-2022_csv.zip";
export const RP_COMMUTE_FILE_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8581610/TD_NAV2A_2022_csv.zip";
const QPV_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8186239/TAG_QPV2024_2025_csv.zip";
const FRANCE_SERVICES_DATASET_URL =
  "https://www.data.gouv.fr/datasets/liste-des-structures-labellisees-france-services/";
const OFGL_URL = "https://data.ofgl.fr/";
const SIDE_URL = "https://www.insee.fr/fr/statistiques/2011101";
const TOURISM_URL = TOURISM_FILE_URL;
const FLORES_URL =
  "https://www.data.gouv.fr/datasets/nombre-detablissements-et-effectifs-salaries-en-17-grands-secteurs/";
const FLORES_FILE_URL =
  "https://api.insee.fr/melodi/file/DS_FLORES_A17/DS_FLORES_A17_2024_CSV_FR";
const ARCEP_URL = "https://www.data.gouv.fr/datasets/ma-connexion-internet/";
const FINESS_URL = "https://www.data.gouv.fr/datasets/reexposition-des-donnees-finess/";
const EDUCATION_URL = "https://www.data.gouv.fr/datasets/annuaire-de-leducation/";
export const IPS_ECOLES_DATASET_URL =
  "https://www.data.gouv.fr/datasets/indices-de-position-sociale-dans-les-ecoles-a-partir-de-2022";
export const IPS_ECOLES_FILE_URL =
  "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips-ecoles-ap2022/exports/csv?delimiter=%3B";
export const IPS_SCHOOL_YEAR = "2024-2025";

const SSMSI_URL =
  "https://www.data.gouv.fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales";

const FRANCE_TRAVAIL_DATASET_URL =
  "https://www.data.gouv.fr/datasets/inscrits-a-france-travail-donnees-communales-trimestrielles-brutes";
export const FRANCE_TRAVAIL_API_BASE =
  "https://data.dares.travail-emploi.gouv.fr/api/explore/v2.1/catalog/datasets/dares_defm_communales-brutes";

/** Dernier trimestre ingéré — recalculé par `ingest-france-travail`. */
export const FRANCE_TRAVAIL_QUARTER = "2024-T4";

/**
 * APL DREES — non intégrée (skipped: true).
 * Gate MCP : export CSV data.drees vide ; jeux data.gouv en xlsx/7z sans bulk communal ≤ 20 Mo.
 */
export const APL_DATASET_URL =
  "https://www.data.gouv.fr/datasets/laccessibilite-potentielle-localisee-apl/";

const CNAF_PRECARITE_DATASET_URL =
  "https://www.data.gouv.fr/datasets/indicateurs-territoriaux-de-precarite-par-commune-epci-departement-et-region/";
export const CNAF_PRECARITE_FILE_URL =
  "https://static.data.gouv.fr/resources/indicateurs-territoriaux-de-precarite-par-commune-epci-departement-et-region/20260306-112349/20260306-indicateurs-precarite.csv";

/** Millésime de la part RSA (CNAF) dans les indicateurs territoriaux de précarité. */
export const CNAF_RSA_VINTAGE = 2024;

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
  CEREMA_LOVAC: "cerema-lovac",
  FRANCE_TRAVAIL_DEFM: "france-travail-defm",
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
  DEPP_IPS_ECOLES: "depp-ips-ecoles",
  CNAF_PRECARITE: "cnaf-precarite",
  AAV: "aav2020",
  INSEE_DENSITY_GRID: "insee-density-grid",
  INSEE_URBAN_UNIT: "insee-urban-unit",
  ANCT_PVD: "anct-pvd",
  ANCT_ACV: "anct-acv",
  DGCL_FRR: "dgcl-frr",
  ANCT_VILLAGES_AVENIR: "anct-villages-avenir",
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
    name: `INSEE — Recensement ${RP_VINTAGE} (structure par âge)`,
    url: RP_POPULATION_PAGE_URL,
    description: `Structure par tranches d'âge de la population communale (RP ${RP_VINTAGE}).`,
    accessedAt,
  };
}

export function createRpEmploymentSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_RP_EMPLOYMENT,
    name: `INSEE — Recensement ${RP_VINTAGE} (emploi)`,
    url: RP_EMPLOYMENT_PAGE_URL,
    description: `Population active et chômage au recensement ${RP_VINTAGE}.`,
    accessedAt,
  };
}

export function createFilosofiSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_FILOSOFI,
    name: `INSEE — FILOSOFI ${FILOSOFI_VINTAGE} (revenus)`,
    url: FILOSOFI_PAGE_URL,
    description: `Niveau de vie médian des ménages (Filosofi 2, millésime ${FILOSOFI_VINTAGE}). Non comparable aux millésimes 2012-2021.`,
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

export function createLovacSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.CEREMA_LOVAC,
    name: `Cerema — LOVAC ${LOVAC_VINTAGE} (parc privé vacants)`,
    url: LOVAC_DATASET_URL,
    description:
      "Logements vacants du parc privé par commune (croisement DGFiP / Fichiers fonciers) — vacance structurelle distincte du recensement.",
    accessedAt,
  };
}

export function createFranceTravailSource(
  accessedAt: string,
  quarter = FRANCE_TRAVAIL_QUARTER,
): DataSource {
  return {
    id: SOURCE_IDS.FRANCE_TRAVAIL_DEFM,
    name: `France Travail — Inscrits communaux (${quarter})`,
    url: FRANCE_TRAVAIL_DATASET_URL,
    description:
      "Demandeurs d'emploi inscrits à France Travail (catégorie ABC, moyenne trimestrielle communale, DARES).",
    accessedAt,
  };
}

export function createCafSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.CNAF_PRECARITE,
    name: `CNAF — Part allocataires RSA (${CNAF_RSA_VINTAGE})`,
    url: CNAF_PRECARITE_DATASET_URL,
    description:
      "Part des allocataires du RSA parmi les ménages (indicateurs territoriaux de précarité CNAF) — seul agrégat CAF en bulk communal ≤ 20 Mo.",
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

export function createDensityGridSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_DENSITY_GRID,
    name: "INSEE — Grille communale de densité (7 niveaux)",
    url: DENSITY_GRID_URL,
    description:
      "Typologie communale de densité à 7 niveaux (millésime 2024, géographie au 1er janvier 2024).",
    accessedAt,
  };
}

export function createUrbanUnitSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_URBAN_UNIT,
    name: "INSEE — Unités urbaines 2020",
    url: URBAN_UNIT_URL,
    description: "Composition communale des unités urbaines 2020 (UU2020).",
    accessedAt,
  };
}

export function createPvdSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.ANCT_PVD,
    name: "ANCT — Petites villes de demain",
    url: PVD_URL,
    description: "Liste des communes bénéficiaires du programme Petites villes de demain.",
    accessedAt,
  };
}

export function createAcvSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.ANCT_ACV,
    name: "ANCT — Action cœur de ville",
    url: ACV_URL,
    description: "Liste des communes bénéficiaires du programme Action cœur de ville.",
    accessedAt,
  };
}

export function createFrrSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.DGCL_FRR,
    name: "DGCL — France Ruralités Revitalisation",
    url: FRR_URL,
    description:
      "Zonage France Ruralités Revitalisation (FRR et FRR+) par commune.",
    accessedAt,
  };
}

export function createVillagesAvenirSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.ANCT_VILLAGES_AVENIR,
    name: "ANCT — Villages d'avenir",
    url: VILLAGES_AVENIR_URL,
    description: "Liste des communes labellisées Villages d'avenir.",
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
    name: `INSEE — RP ${RP_VINTAGE} logement`,
    url: RP_HOUSING_PAGE_URL,
    description: `Parc de logements et vacance générale au recensement ${RP_VINTAGE}.`,
    accessedAt,
  };
}

export function createCommuteSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.INSEE_RP_COMMUTE,
    name: `INSEE — RP ${RP_VINTAGE} mobilité domicile-travail`,
    url: RP_COMMUTE_PAGE_URL,
    description:
      `Modes de transport principal des actifs occupés de 15 ans ou plus (recensement ${RP_VINTAGE}).`,
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

export function createIpsSource(accessedAt: string): DataSource {
  return {
    id: SOURCE_IDS.DEPP_IPS_ECOLES,
    name: `DEPP — IPS écoles (${IPS_SCHOOL_YEAR})`,
    url: IPS_ECOLES_DATASET_URL,
    description:
      "Indice de position sociale des écoles (agrégat communal des établissements éligibles).",
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
