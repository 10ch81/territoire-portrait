import type { TerritorialFacts } from "./mistral-facts";
import {
  BPE_EQUIPMENT_NOTE,
  BPE_TRANSPORT_NOTE_LIMITED,
  BPE_TRANSPORT_NOTE_WITH_TYPES,
} from "./bpe-semantics";

function buildEquipementsFacts(options: {
  total: number;
  domainesPresents: string[];
  resumeQualitatif: string;
  transportCount?: number;
  transportTypes?: Array<{ code: string; label: string; count: number }>;
}): NonNullable<TerritorialFacts["equipements"]> {
  const transportTypes = options.transportTypes ?? [];

  return {
    annee: 2024,
    total: options.total,
    resumeQualitatif: options.resumeQualitatif,
    semantiqueDomaines: {
      metrique: "nombre de types par domaine (ne recompose pas le total)",
      recomposeLeTotal: false,
      domainesPresents: options.domainesPresents,
    },
    principauxTypesPartiels: [],
    transports: {
      totalEquipments: options.transportCount ?? 0,
      byType: transportTypes,
      available: true,
      note:
        transportTypes.length > 0
          ? BPE_TRANSPORT_NOTE_WITH_TYPES
          : BPE_TRANSPORT_NOTE_LIMITED,
    },
    note: BPE_EQUIPMENT_NOTE,
  };
}

function baseFacts(overrides: Partial<TerritorialFacts> = {}): TerritorialFacts {
  return {
    nom: "Commune test",
    codeInsee: "00000",
    codesPostaux: ["00000"],
    departement: { code: "00", name: "Département test" },
    region: { code: "00", name: "Région test" },
    epci: { code: "200000000", name: "EPCI test" },
    populationLegale: 5000,
    populationMillesime: 2022,
    definitionPopulation: "Population municipale",
    notesPopulation: [],
    densiteHabKm2: 120,
    coordonnees: { latitude: 48.0, longitude: 2.0 },
    surfaceKm2: 40,
    evolutionDemographique: [{ year: 2020, population: 4900 }],
    structureParAge: null,
    entreprises: null,
    equipements: null,
    risques: null,
    securite: null,
    logementsSociaux: null,
    mobilite: null,
    politiqueVille: null,
    fiscalite: null,
    comptesPublics: null,
    servicesProximite: null,
    tourisme: null,
    geographie: {
      aireAttraction: null,
      comparatifEpci: null,
      centraliteTerritoriale: {
        qualificationRecommandee: "commune-centre de son bassin territorial",
        centraliteDepartementale: false,
        note: "",
      },
    },
    immobilier: null,
    indicateursDerives: null,
    sources: [],
    ...overrides,
  };
}

/** Paris — commune urbaine dense, sans QPV. */
export const urbanDenseFacts: TerritorialFacts = baseFacts({
  nom: "Paris",
  codeInsee: "75056",
  populationLegale: 2_113_705,
  densiteHabKm2: 20_000,
  structureParAge: {
    tranches: [],
    aggregatsAge: null,
    tauxChomage1564: 7.8,
    revenuMedianDisponible: 28_000,
    note: "RP 2021",
  },
  entreprises: {
    referenceStatistique: {
      source: "INSEE SIDE",
      annee: 2022,
      unitesLegales: 220_000,
      etablissements: 280_000,
    },
    complementAdministratif: {
      source: "API SIRENE",
      unitesLegalesAvecEtablissement: 225_000,
      totalPlafonneApi: true,
      ess: 12_000,
      rge: 4_000,
    },
    avertissementDivergenceSireneSide: null,
    note: "",
  },
  equipements: buildEquipementsFacts({
    total: 5000,
    domainesPresents: [
      "Services pour les particuliers",
      "Commerces",
      "Santé et action sociale",
      "Sports, loisirs et culture",
    ],
    resumeQualitatif:
      "5000 équipements recensés, avec une diversité de services de proximité, commerces, santé et action sociale et équipements de loisirs.",
    transportCount: 200,
    transportTypes: [{ code: "E101", label: "Taxis-VTC", count: 120 }],
  }),
  mobilite: {
    irve: { pointsDeCharge: 1200, stations: 400 },
    domicileTravail: {
      actifsOccupes: 900_000,
      partVoiture: 12,
      partTransportsCommun: 68,
    },
    note: "",
  },
  immobilier: {
    annee: 2024,
    prixM2Moyen: 10_500,
    prixMoyenMutation: 650_000,
    mutations: 8_000,
    mutationsMaisons: 50,
    mutationsAppartements: 7_950,
    serieHistorique: [
      { year: 2022, averagePricePerM2: 10_200, mutationCount: 7_500 },
      { year: 2023, averagePricePerM2: 10_350, mutationCount: 7_800 },
      { year: 2024, averagePricePerM2: 10_500, mutationCount: 8_000 },
    ],
    prixM2MoyenDepartement: 10_500,
    note: "Moyennes DVF agrégées",
  },
  politiqueVille: {
    qpv: false,
    nombreQpv: 0,
    libelles: [],
    note: "",
  },
});

/** L'Abergement-Clémenciat — commune rurale. */
export const ruralFacts: TerritorialFacts = baseFacts({
  nom: "L'Abergement-Clémenciat",
  codeInsee: "01001",
  populationLegale: 832,
  densiteHabKm2: 45,
  evolutionDemographique: [{ year: 2020, population: 820 }],
  politiqueVille: {
    qpv: false,
    nombreQpv: 0,
    libelles: [],
    note: "",
  },
});

/** Annecy — profil touristique sans fréquentation. */
export const touristicFacts: TerritorialFacts = baseFacts({
  nom: "Annecy",
  codeInsee: "74010",
  populationLegale: 128_199,
  densiteHabKm2: 1_200,
  tourisme: {
    annee: 2025,
    placesHebergement: 12_500,
    note: "Capacité d'hébergement touristique, sans fréquentation",
  },
  immobilier: {
    annee: 2024,
    prixM2Moyen: 5_800,
    prixMoyenMutation: 420_000,
    mutations: 450,
    mutationsMaisons: 120,
    mutationsAppartements: 330,
    serieHistorique: [{ year: 2024, averagePricePerM2: 5_800, mutationCount: 450 }],
    prixM2MoyenDepartement: 4_200,
    note: "",
  },
});

/** Ville avec QPV. */
export const withQpvFacts: TerritorialFacts = baseFacts({
  nom: "Ville QPV",
  codeInsee: "93066",
  populationLegale: 110_000,
  politiqueVille: {
    qpv: true,
    nombreQpv: 2,
    libelles: ["QPV Centre", "QPV Nord"],
    note: "Sous-périmètres QPV",
  },
});

/** Commune sans QPV explicite. */
export const withoutQpvFacts: TerritorialFacts = ruralFacts;

/** Peu de mutations DVF. */
export const fewDvfMutationsFacts: TerritorialFacts = baseFacts({
  nom: "Petite commune DVF",
  codeInsee: "15123",
  populationLegale: 320,
  immobilier: {
    annee: 2024,
    prixM2Moyen: null,
    prixMoyenMutation: null,
    mutations: 3,
    mutationsMaisons: 2,
    mutationsAppartements: 1,
    serieHistorique: [{ year: 2024, averagePricePerM2: null, mutationCount: 3 }],
    prixM2MoyenDepartement: 1_200,
    note: "Volume faible",
  },
});

/** SSMSI partiel — une seule année, indicateurs diffus limités. */
export const partialSsmsiFacts: TerritorialFacts = baseFacts({
  nom: "Commune SSMSI partiel",
  codeInsee: "23096",
  securite: {
    annee: 2023,
    indicateurs: [
      {
        id: "vols",
        label: "Vols",
        count: 12,
        ratePer1000: 4.2,
        departmentRatePer1000: 5.1,
        diffused: true,
      },
    ],
    indicateursDiffuses: 1,
    note: "Indicateurs partiellement diffusés",
  },
});

/** Forte divergence SIRENE / SIDE. */
export const sireneSideDivergenceFacts: TerritorialFacts = baseFacts({
  nom: "Commune divergence",
  codeInsee: "44162",
  entreprises: {
    referenceStatistique: {
      source: "INSEE SIDE",
      annee: 2022,
      unitesLegales: 420,
      etablissements: 510,
    },
    complementAdministratif: {
      source: "API SIRENE",
      unitesLegalesAvecEtablissement: 1_200,
      totalPlafonneApi: false,
      ess: 35,
      rge: 12,
    },
    avertissementDivergenceSireneSide:
      "Écart important entre SIRENE API et SIDE INSEE — interpréter avec prudence.",
    note: "",
  },
});

/** Saint-Girons — cas de régression (commune-centre, mobilité modale, Ariège). */
export const saintGironsFacts: TerritorialFacts = baseFacts({
  nom: "Saint-Girons",
  codeInsee: "09225",
  codesPostaux: ["09200"],
  departement: { code: "09", name: "Ariège" },
  region: { code: "76", name: "Occitanie" },
  epci: { code: "200027183", name: "CC Couserans Pyrenées" },
  populationLegale: 6_184,
  densiteHabKm2: 280,
  evolutionDemographique: [
    { year: 2010, population: 6_560 },
    { year: 2022, population: 6_184 },
  ],
  structureParAge: {
    tranches: [
      { label: "60-74 ans", population: 1_180, sharePercent: 18.5 },
      { label: "75-89 ans", population: 770, sharePercent: 12.1 },
      { label: "90 ans ou plus", population: 48, sharePercent: 7.5 },
    ],
    aggregatsAge: {
      soixanteQuatorze: 18.5,
      soixanteQuinzeQuatreVingtNeuf: 12.1,
      quatreVingtDixPlus: 7.5,
      soixantePlus: 38.1,
      fiable: true,
      note: "60 ans et plus = somme des parts 60-74, 75-89 et 90+.",
    },
    tauxChomage1564: 11.2,
    revenuMedianDisponible: 19_500,
    note: "RP 2021",
  },
  entreprises: {
    referenceStatistique: {
      source: "INSEE SIDE",
      annee: 2022,
      unitesLegales: 680,
      etablissements: 820,
    },
    complementAdministratif: {
      source: "API SIRENE",
      unitesLegalesAvecEtablissement: 710,
      totalPlafonneApi: false,
      ess: 48,
      rge: 15,
    },
    avertissementDivergenceSireneSide: null,
    note: "",
  },
  equipements: buildEquipementsFacts({
    total: 85,
    domainesPresents: [
      "Services pour les particuliers",
      "Commerces",
      "Transports et déplacements",
    ],
    resumeQualitatif:
      "85 équipements recensés, avec une diversité de services de proximité, commerces et transports.",
    transportCount: 4,
    transportTypes: [{ code: "E101", label: "Taxis-VTC", count: 4 }],
  }),
  mobilite: {
    irve: { pointsDeCharge: 6, stations: 2 },
    domicileTravail: {
      actifsOccupes: 2_400,
      partVoiture: 78,
      partTransportsCommun: 4,
    },
    note: "Parts modales domicile-travail 2021",
  },
  fiscalite: {
    annee: 2024,
    tauxTfb: 25.12,
    tauxTfnb: 45.0,
    note: "Taux REI communal",
  },
  geographie: {
    aireAttraction: {
      code: "091",
      label: "Saint-Girons",
      categoryCode: "4",
      categoryLabel: "Commune-centre d'aire d'attraction",
      available: true,
      note: "",
    },
    comparatifEpci: {
      epciName: "CC Couserans Pyrenées",
      communeCount: 27,
      communeRankByPopulation: 1,
      communeRankByDensity: 2,
      epciAveragePopulation: 1_100,
      epciAverageDensity: 35,
      available: true,
      note: "",
    },
    centraliteTerritoriale: {
      qualificationRecommandee: "commune-centre de l'EPCI",
      centraliteDepartementale: false,
      note: "",
    },
  },
  immobilier: {
    annee: 2024,
    prixM2Moyen: 1_450,
    prixMoyenMutation: 165_000,
    mutations: 42,
    mutationsMaisons: 30,
    mutationsAppartements: 12,
    serieHistorique: [{ year: 2024, averagePricePerM2: 1_450, mutationCount: 42 }],
    prixM2MoyenDepartement: 1_300,
    note: "",
  },
  indicateursDerives: {
    populationGrowthPercent: -5.7,
    populationGrowthFromYear: 2010,
    populationGrowthToYear: 2022,
    irvePointsPer1000Residents: 0.97,
    socialHousingVacancyRatePercent: null,
    equipmentsPer1000Residents: 13.7,
    available: true,
    note: "",
  },
  logementsSociaux: {
    annee: 2024,
    parcTotal: 0,
    loues: 0,
    vacantsRpls: 0,
    parcLogementsGlobal: 3_200,
    vacantsRp: 180,
    tauxVacanceRp: 5.6,
    partDuParcGlobal: 0,
    tauxVacanceRpls: null,
    note: "RPLS",
  },
  tourisme: {
    annee: 2025,
    placesHebergement: 320,
    note: "Sans fréquentation",
  },
  politiqueVille: {
    qpv: false,
    nombreQpv: 0,
    libelles: [],
    note: "",
  },
  risques: {
    radon: null,
    inondation: { zones: ["Zone A"], count: 1 },
    catnat: [
      { label: "Inondation et/ou Coulées de boue", startDate: "2018-06-01" },
      { label: "Inondation et/ou Coulées de boue", startDate: "2020-10-12" },
      { label: "Inondation et/ou Coulées de boue", startDate: "2022-03-05" },
      { label: "Inondation et/ou Coulées de boue", startDate: "2024-01-18" },
      { label: "Neige / Avalanche / Grand Froid", startDate: "2021-02-09" },
    ],
    note: "",
  },
});

export const COMMUNE_FIXTURES = [
  { id: "urban-dense", label: "commune urbaine dense", facts: urbanDenseFacts },
  { id: "rural", label: "commune rurale", facts: ruralFacts },
  { id: "touristic", label: "commune touristique", facts: touristicFacts },
  { id: "with-qpv", label: "commune avec QPV", facts: withQpvFacts },
  { id: "without-qpv", label: "commune sans QPV", facts: withoutQpvFacts },
  { id: "few-dvf", label: "commune peu de mutations DVF", facts: fewDvfMutationsFacts },
  { id: "partial-ssmsi", label: "commune SSMSI partiel", facts: partialSsmsiFacts },
  {
    id: "sirene-side-divergence",
    label: "commune divergence SIRENE/SIDE",
    facts: sireneSideDivergenceFacts,
  },
  { id: "saint-girons", label: "Saint-Girons régression", facts: saintGironsFacts },
] as const;

/** Analyse volontairement fragile simulant une sortie Mistral non contrôlée. */
export function fragileAnalysisForFixture(fixtureId: string): {
  summary: string;
  strengths: string[];
  watchPoints: string[];
  opportunities: string[];
} {
  const common = {
    summary:
      "Chef-lieu de l'EPCI, fonction centrale économique et administrative dans une aire urbaine de catégorie 11.",
    strengths: [
      "Les données ESS sont incluses dans le total SIDE, confirmant une complémentarité entre SIDE et ESS/RGE.",
      "Dynamique immobilière soutenue et prix moyens stables avec résilience des volumes.",
      "Tissu entrepreneurial local dynamique selon le stock SIDE.",
      "Accessibilité aux infrastructures renforcée par l'IRVE et les taxis-VTC.",
      "515 équipements, dont commerces (3).",
      "Faible dépendance aux transports en commun selon les parts modales.",
    ],
    watchPoints: [
      "Tendance à la hausse des faits de sécurité et insécurité croissante.",
      "Enjeux sécuritaires marqués sur le territoire.",
      "Offre de transport limitée malgré une part modale voiture élevée.",
      "Offre de transport collectif limitée.",
      "Tensions sociales possibles dans certains quartiers.",
      "Taux de chômage supérieur aux indicateurs départementaux.",
      "Taux de chômage élevé, à décrire sans comparaison départementale homogène fournie disponibles.",
      "Offre économique locale marquée selon le stock SIDE.",
      "Dynamique démographique en déclin sur la période récente.",
    ],
    opportunities: [
      "Potentiel touristique sous-exploité compte tenu des capacités d'hébergement.",
      "Pression fiscale faible propice à l'attractivité.",
      "L'accessibilité immobilière reste favorable selon les moyennes disponibles.",
      "Opportunité en lien avec les agences immobilières locales.",
      "Acteurs ESS mobilisables pour accélérer la transition.",
    ],
  };

  if (fixtureId === "urban-dense") {
    return {
      ...common,
      summary:
        "Métropole dense, chef-lieu de l'EPCI, avec un chômage inférieur au taux national.",
      watchPoints: [
        ...common.watchPoints,
        "De nombreux actifs travaillant hors de la commune utilisent la voiture.",
      ],
    };
  }

  if (fixtureId === "saint-girons") {
    return {
      summary:
        "Saint-Girons, chef-lieu de l'EPCI, pôle d'une aire urbaine avec fonction centrale économique et administrative. Recul démographique modéré (-38,1 % entre 2010 et 2022).",
      strengths: [
        "Complémentarité entre SIDE et ESS/RGE avec des RGE incluses dans le stock SIDE.",
        "Dynamique immobilière soutenue sur 42 mutations.",
      ],
      watchPoints: [
        "Tendance à la hausse des indicateurs SSMSI sur l'année disponible.",
        "78 % des actifs travaillant hors de la commune selon les parts modales.",
        "5 inondations CATNAT recensées sur la commune.",
        "Faible dépendance aux transports en commun malgré 4 % de part modale TC.",
      ],
      opportunities: [
        "Potentiel touristique sous-exploité dans le Couserans.",
        "Offre de transport limitée à renforcer.",
      ],
    };
  }

  return common;
}
