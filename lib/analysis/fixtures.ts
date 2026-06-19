import type { TerritoryProfile, TerritoryEnrichment, SocialHousingSnapshot } from "../types";
import type { ComparisonProfile, TerritoryTypology } from "../typology/types";

const HOUSING_LOVAC_ABSENT: Pick<
  SocialHousingSnapshot,
  | "lovacVintage"
  | "privateVacantDwellings"
  | "privateVacancyRatePercent"
  | "privateVacantStructural"
  | "lovacNote"
> = {
  lovacVintage: null,
  privateVacantDwellings: null,
  privateVacancyRatePercent: null,
  privateVacantStructural: null,
  lovacNote: null,
};

const EDUCATION_IPS_ABSENT = {
  ipsSchoolYear: null,
  averageIps: null,
  schoolsWithIps: null,
  ipsMin: null,
  ipsMax: null,
  ipsNote: null,
} as const;

function baseEnrichment(overrides: Partial<TerritoryEnrichment> = {}): TerritoryEnrichment {
  return {
    populationHistory: null,
    sociodemographics: null,
    labourMarket: null,
    enterprises: null,
    employmentSectors: null,
    equipments: null,
    education: null,
    health: null,
    risks: null,
    security: null,
    housing: null,
    mobility: null,
    urbanPolicy: null,
    fiscal: null,
    publicAccounts: null,
    proximityServices: null,
    tourism: null,
    geography: null,
    property: null,
    derived: null,
    territoryTypology: null,
    sources: [],
    ...overrides,
  };
}

/** Saint-Girons (09225) — cas de régression démographie / vieillissement / SIDE. */
export const saintGironsProfile: TerritoryProfile = {
  name: "Saint-Girons",
  inseeCode: "09225",
  postalCodes: ["09200"],
  department: { code: "09", name: "Ariège" },
  region: { code: "76", name: "Occitanie" },
  epci: { code: "200027183", name: "CC Couserans Pyrenées" },
  population: 6_008,
  densityPerKm2: 280,
  coordinates: { latitude: 42.984, longitude: 1.145 },
  surfaceKm2: 21.5,
  sources: [],
  enrichment: baseEnrichment({
    populationHistory: {
      latestYear: 2022,
      latestPopulation: 6_008,
      history: [
        { year: 2010, population: 6_371 },
        { year: 2022, population: 6_008 },
      ],
      available: true,
      note: "",
    },
    sociodemographics: {
      year: 2022,
      incomeYear: 2023,
      ageBands: [
        { label: "60-74 ans", population: 1_111, sharePercent: 18.5 },
        { label: "75-89 ans", population: 727, sharePercent: 12.1 },
        { label: "90 ans ou plus", population: 45, sharePercent: 7.5 },
      ],
      unemploymentRate: 11.2,
      medianDisposableIncome: 19_500,
      available: true,
      note: "RP 2022",
    },
    derived: {
      populationGrowthPercent: -5.7,
      populationGrowthFromYear: 2010,
      populationGrowthToYear: 2022,
      irvePointsPer1000Residents: null,
      socialHousingVacancyRatePercent: null,
      equipmentsPer1000Residents: 85.7,
      available: true,
      note: "",
    },
    enterprises: {
      legalUnitsWithEstablishment: 710,
      legalUnitsIsCapped: false,
      essCount: 289,
      rgeCount: 12,
      inseeLegalUnits: 658,
      inseeEstablishments: 749,
      inseeSideYear: 2022,
      millesime: "2022",
      divergenceWarning: null,
      note: "",
    },
    employmentSectors: {
      year: 2022,
      totalEstablishments: 620,
      totalSalariedPosts: 4_200,
      sectors: [
        { code: "GZ", label: "Commerce", establishments: 120, salariedPosts: 800 },
        { code: "KQ", label: "Santé humaine", establishments: 45, salariedPosts: 650 },
        { code: "OQ", label: "Administration publique", establishments: 30, salariedPosts: 500 },
      ],
      available: true,
      note: "FLORES A17 ; pas d'analyse d'évolution.",
    },
    equipments: {
      year: 2024,
      totalEquipments: 515,
      byDomain: [
        { code: "A", label: "Services pour les particuliers", count: 12 },
        { code: "B", label: "Commerces", count: 8 },
        { code: "D", label: "Santé et action sociale", count: 6 },
      ],
      byType: [
        { code: "A101", label: "Bureau de poste", count: 1 },
        { code: "B201", label: "Supérette", count: 3 },
      ],
      transport: {
        totalEquipments: 4,
        byType: [{ code: "E101", label: "Taxis-VTC", count: 4 }],
        available: true,
        note: "",
      },
      available: true,
      note: "",
      domainBreakdownLabel: "Types par domaine",
      topTypesLabel: "Top types",
      qualitativeSummary:
        "515 équipements recensés, avec une diversité de services de proximité, commerces et santé.",
      domainCountsAreTypeCounts: true,
    },
    housing: {
      year: 2022,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      totalDwellings: 3_500,
      rpVacantDwellings: 658,
      rpVacancyRatePercent: 18.8,
      socialHousingSharePercent: 0,
      vacancyRatePercent: null,
      ...HOUSING_LOVAC_ABSENT,
      available: true,
      note: "RPLS + RP logement",
    },
    mobility: {
      irve: {
        year: 2024,
        chargingPoints: 6,
        stations: 2,
        available: true,
        note: "",
      },
      commute: {
        year: 2022,
        employedCount: 2_400,
        carSharePercent: 69.3,
        publicTransportSharePercent: 0.8,
        available: true,
        note: "",
      },
      connectivity: {
        vintage: "2025_T4",
        fiberEligibleSharePercent: 72.5,
        totalPremises: 3_200,
        fiberEligiblePremises: 2_320,
        technologies: ["Fibre", "Cuivre"],
        available: true,
        note: "Estimation IPE ARCEP",
      },
    },
    health: {
      year: 2024,
      totalEstablishments: 12,
      totalCapacity: null,
      byCategory: [{ code: "1", label: "Établissements sanitaires", count: 3 }],
      byType: [{ code: "101", label: "Centres de santé", count: 2 }],
      available: true,
      note: "",
    },
    education: {
      year: 2024,
      totalOpen: 5,
      byType: [{ code: "E", label: "École", count: 4 }],
      bySector: [
        { code: "PU", label: "Public", count: 4 },
        { code: "PR", label: "Privé", count: 1 },
      ],
      byLevel: [{ code: "1", label: "Élémentaire", count: 3 }],
      ...EDUCATION_IPS_ABSENT,
      available: true,
      note: "",
    },
    security: {
      year: 2024,
      indicators: [
        {
          id: "violences",
          label: "Violences physiques",
          count: 45,
          ratePer1000: 7.5,
          departmentRatePer1000: 5.2,
          diffused: true,
        },
      ],
      diffusedIndicatorCount: 1,
      available: true,
      note: "",
    },
    risks: {
      radon: null,
      flood: { zones: ["Zone A"], count: 1 },
      catNatEvents: [
        { label: "Inondation et/ou Coulées de boue", startDate: "2018-06-01" },
        { label: "Inondation et/ou Coulées de boue", startDate: "2020-10-12" },
      ],
      available: true,
      note: "",
    },
    tourism: {
      year: 2025,
      accommodationPlaces: 75,
      available: true,
      note: "Sans fréquentation",
    },
    property: {
      year: 2024,
      averagePricePerM2: 1_429,
      averageTransactionPrice: 165_000,
      mutationCount: 114,
      houseMutations: 80,
      apartmentMutations: 34,
      houseSharePercent: null,
      apartmentSharePercent: null,
      priceHistory: [],
      departmentCode: "09",
      departmentAveragePricePerM2: 1_300,
      available: true,
      note: "",
    },
    geography: {
      attractionArea: {
        code: "091",
        label: "Saint-Girons",
        categoryCode: "4",
        categoryLabel: "Commune-centre d'aire d'attraction",
        available: true,
        note: "",
      },
      epciComparison: {
        epciName: "CC Couserans Pyrenées",
        communeCount: 27,
        communeRankByPopulation: 1,
        communeRankByDensity: 2,
        epciAveragePopulation: 1_100,
        epciAverageDensity: 35,
        available: true,
        note: "",
      },
    },
    urbanPolicy: {
      year: 2024,
      hasQpv: false,
      qpvCount: 0,
      qpvLabels: [],
      available: true,
      note: "",
    },
  }),
};

export const ruralProfileMinimal: TerritoryProfile = {
  name: "Commune rurale",
  inseeCode: "01001",
  postalCodes: ["01000"],
  department: { code: "01", name: "Ain" },
  region: { code: "84", name: "Auvergne-Rhône-Alpes" },
  epci: null,
  population: 800,
  densityPerKm2: 25,
  coordinates: null,
  surfaceKm2: 32,
  sources: [],
  enrichment: null,
};

export type PanelPreset =
  | "ruralSparse"
  | "urbanDense"
  | "periurban"
  | "tourist"
  | "coastal"
  | "mountain"
  | "coastalOrMountain"
  | "industrial"
  | "residential"
  | "withQpv"
  | "withoutQpv"
  | "lowSsmsi"
  | "lowDvf"
  | "sideSireneDivergence"
  | "withFlores"
  | "withFiness"
  | "withEducation"
  | "withArcep"
  | "demographicGrowth"
  | "moderateEmployment"
  | "lowMunicipalDebt"
  | "highMunicipalDebt"
  | "compositeIncomeFragility"
  | "twoNegativeEnjeux"
  | "lowTourismCapacity"
  | "lowEssVolume"
  | "sireneCapped"
  | "fullEnrichment";

function baseProfile(
  name: string,
  inseeCode: string,
  population: number,
  density: number,
  enrichment: Partial<TerritoryEnrichment>,
): TerritoryProfile {
  return {
    name,
    inseeCode,
    postalCodes: ["00000"],
    department: { code: "99", name: "Département test" },
    region: { code: "99", name: "Région test" },
    epci: { code: "200000000", name: "EPCI test" },
    population,
    densityPerKm2: density,
    coordinates: null,
    surfaceKm2: population / Math.max(density, 1),
    sources: [],
    enrichment: baseEnrichment(enrichment),
  };
}

export function createPanelProfile(preset: PanelPreset): TerritoryProfile {
  switch (preset) {
    case "ruralSparse":
      return baseProfile("Commune rurale peu équipée", "99001", 450, 18, {
        equipments: {
          year: 2024,
          totalEquipments: 12,
          byDomain: [{ code: "B", label: "Commerces", count: 2 }],
          byType: [{ code: "B201", label: "Supérette", count: 1 }],
          transport: { totalEquipments: 0, byType: [], available: false, note: "" },
          available: true,
          note: "",
          domainBreakdownLabel: "Types",
          topTypesLabel: "Top",
          qualitativeSummary: "Peu d'équipements recensés.",
          domainCountsAreTypeCounts: true,
        },
        derived: {
          populationGrowthPercent: -8.2,
          populationGrowthFromYear: 2010,
          populationGrowthToYear: 2022,
          irvePointsPer1000Residents: null,
          socialHousingVacancyRatePercent: null,
          equipmentsPer1000Residents: 26.7,
          available: true,
          note: "",
        },
        populationHistory: {
          latestYear: 2022,
          latestPopulation: 450,
          history: [
            { year: 2010, population: 490 },
            { year: 2022, population: 450 },
          ],
          available: true,
          note: "",
        },
      });
    case "urbanDense":
      return baseProfile("Commune urbaine dense", "99002", 85_000, 4_200, {
        sociodemographics: {
          year: 2022,
          incomeYear: 2023,
          ageBands: [{ label: "60-74 ans", population: 12_000, sharePercent: 14.1 }],
          unemploymentRate: 12.5,
          medianDisposableIncome: 16_800,
          available: true,
          note: "",
        },
        urbanPolicy: {
          year: 2024,
          hasQpv: true,
          qpvCount: 2,
          qpvLabels: ["QPV Nord", "QPV Centre"],
          available: true,
          note: "",
        },
        security: {
          year: 2024,
          indicators: [
            {
              id: "vols",
              label: "Vols",
              count: 800,
              ratePer1000: 9.4,
              departmentRatePer1000: 6.1,
              diffused: true,
            },
          ],
          diffusedIndicatorCount: 1,
          available: true,
          note: "",
        },
        property: {
          year: 2024,
          averagePricePerM2: 3_500,
          averageTransactionPrice: 280_000,
          mutationCount: 420,
          houseMutations: 200,
          apartmentMutations: 220,
          houseSharePercent: null,
          apartmentSharePercent: null,
          priceHistory: [],
          departmentCode: "99",
          departmentAveragePricePerM2: 3_200,
          available: true,
          note: "",
        },
        housing: {
          year: 2022,
          totalUnits: 5_000,
          occupiedUnits: 4_800,
          vacantUnits: 200,
          totalDwellings: 42_000,
          rpVacantDwellings: 3_200,
          rpVacancyRatePercent: 7.6,
          socialHousingSharePercent: 18,
          vacancyRatePercent: null,
          ...HOUSING_LOVAC_ABSENT,
          available: true,
          note: "",
        },
      });
    case "periurban":
      return baseProfile("Commune périurbaine", "99003", 12_000, 450, {
        mobility: {
          irve: { year: 2024, chargingPoints: 8, stations: 3, available: true, note: "" },
          commute: {
            year: 2022,
            employedCount: 5_500,
            carSharePercent: 82.4,
            publicTransportSharePercent: 4.2,
            available: true,
            note: "",
          },
          connectivity: {
            vintage: "2025_T4",
            fiberEligibleSharePercent: 55.0,
            totalPremises: 5_000,
            fiberEligiblePremises: 2_750,
            technologies: ["Fibre", "Cuivre"],
            available: true,
            note: "",
          },
        },
      });
    case "tourist":
      return baseProfile("Commune touristique", "99004", 3_500, 120, {
        tourism: {
          year: 2025,
          accommodationPlaces: 1_200,
          available: true,
          note: "",
        },
      });
    case "coastalOrMountain":
    case "coastal":
      return baseProfile("Commune littorale", "99005", 2_100, 95, {
        risks: {
          radon: null,
          flood: { zones: ["Zone A", "Zone B"], count: 2 },
          catNatEvents: [
            { label: "Inondation et/ou Coulées de boue", startDate: "2019-01-01" },
          ],
          available: true,
          note: "",
        },
      });
    case "mountain":
      return baseProfile("Commune de montagne", "99011", 1_800, 45, {
        risks: {
          radon: { potentialClass: "3", label: "Catégorie 3" },
          flood: { zones: ["Zone A"], count: 1 },
          catNatEvents: [{ label: "Sécheresse", startDate: "2022-07-01" }],
          available: true,
          note: "",
        },
      });
    case "industrial":
      return baseProfile("Commune industrielle", "99012", 22_000, 650, {
        employmentSectors: {
          year: 2022,
          totalEstablishments: 420,
          totalSalariedPosts: 8_500,
          sectors: [
            { code: "CF", label: "Industrie manufacturière", establishments: 85, salariedPosts: 3_200 },
            { code: "GZ", label: "Commerce", establishments: 60, salariedPosts: 900 },
          ],
          available: true,
          note: "",
        },
        enterprises: {
          legalUnitsWithEstablishment: 900,
          legalUnitsIsCapped: false,
          essCount: 20,
          rgeCount: 8,
          inseeLegalUnits: 880,
          inseeEstablishments: 950,
          inseeSideYear: 2022,
          millesime: "2022",
          divergenceWarning: null,
          note: "",
        },
      });
    case "residential":
      return baseProfile("Commune résidentielle", "99013", 28_000, 3_100, {
        housing: {
          year: 2022,
          totalUnits: 2_800,
          occupiedUnits: 2_700,
          vacantUnits: 100,
          totalDwellings: 14_000,
          rpVacantDwellings: 420,
          rpVacancyRatePercent: 3.0,
          socialHousingSharePercent: 12,
          vacancyRatePercent: null,
          ...HOUSING_LOVAC_ABSENT,
          available: true,
          note: "",
        },
        sociodemographics: {
          year: 2022,
          incomeYear: 2023,
          ageBands: [{ label: "30-44 ans", population: 6_500, sharePercent: 23.2 }],
          unemploymentRate: 6.5,
          medianDisposableIncome: 24_500,
          available: true,
          note: "",
        },
      });
    case "withFlores":
      return baseProfile("Commune avec FLORES", "99014", 9_000, 220, {
        employmentSectors: {
          year: 2022,
          totalEstablishments: 180,
          totalSalariedPosts: 2_100,
          sectors: [
            { code: "KQ", label: "Santé humaine", establishments: 25, salariedPosts: 450 },
          ],
          available: true,
          note: "",
        },
      });
    case "withFiness":
      return baseProfile("Commune avec FINESS", "99015", 6_500, 180, {
        health: {
          year: 2024,
          totalEstablishments: 8,
          totalCapacity: null,
          byCategory: [{ code: "1", label: "Établissements sanitaires", count: 2 }],
          byType: [],
          available: true,
          note: "",
        },
      });
    case "withEducation":
      return baseProfile("Commune avec éducation", "99016", 11_000, 310, {
        education: {
          year: 2024,
          totalOpen: 6,
          byType: [{ code: "E", label: "École", count: 5 }],
          bySector: [{ code: "PU", label: "Public", count: 5 }],
          byLevel: [{ code: "1", label: "Élémentaire", count: 4 }],
          ...EDUCATION_IPS_ABSENT,
          available: true,
          note: "",
        },
      });
    case "withArcep":
      return baseProfile("Commune avec ARCEP", "99017", 4_200, 140, {
        mobility: {
          irve: { year: 2024, chargingPoints: 0, stations: 0, available: false, note: "" },
          commute: {
            year: 2022,
            employedCount: 1_800,
            carSharePercent: 75.0,
            publicTransportSharePercent: 3.0,
            available: true,
            note: "",
          },
          connectivity: {
            vintage: "2025_T4",
            fiberEligibleSharePercent: 88.0,
            totalPremises: 2_000,
            fiberEligiblePremises: 1_760,
            technologies: ["Fibre"],
            available: true,
            note: "",
          },
        },
      });
    case "withQpv":
      return baseProfile("Commune avec QPV", "99006", 18_000, 2_800, {
        urbanPolicy: {
          year: 2024,
          hasQpv: true,
          qpvCount: 1,
          qpvLabels: ["QPV Test"],
          available: true,
          note: "",
        },
      });
    case "withoutQpv":
      return baseProfile("Commune périurbaine standard", "99007", 18_000, 2_800, {
        urbanPolicy: {
          year: 2024,
          hasQpv: false,
          qpvCount: 0,
          qpvLabels: [],
          available: true,
          note: "",
        },
      });
    case "lowSsmsi":
      return baseProfile("Commune faible SSMSI", "99008", 5_000, 200, {
        security: {
          year: 2024,
          indicators: [
            {
              id: "vols",
              label: "Vols",
              count: 5,
              ratePer1000: 1.0,
              departmentRatePer1000: 4.5,
              diffused: true,
            },
          ],
          diffusedIndicatorCount: 1,
          available: true,
          note: "",
        },
      });
    case "lowDvf":
      return baseProfile("Commune peu de mutations DVF", "99009", 900, 35, {
        property: {
          year: 2024,
          averagePricePerM2: 950,
          averageTransactionPrice: 120_000,
          mutationCount: 3,
          houseMutations: 2,
          apartmentMutations: 1,
          houseSharePercent: null,
          apartmentSharePercent: null,
          priceHistory: [],
          departmentCode: "99",
          departmentAveragePricePerM2: 1_100,
          available: true,
          note: "",
        },
      });
    case "sideSireneDivergence":
      return baseProfile("Commune divergence SIDE/SIRENE", "99010", 7_000, 180, {
        enterprises: {
          legalUnitsWithEstablishment: 500,
          legalUnitsIsCapped: false,
          essCount: 40,
          rgeCount: 5,
          inseeLegalUnits: 480,
          inseeEstablishments: 520,
          inseeSideYear: 2022,
          millesime: "2022",
          divergenceWarning:
            "Écart entre SIDE (480 UL) et SIRENE live (512 UL) : millésimes ou périmètres distincts.",
          note: "",
        },
      });
    case "demographicGrowth":
      return baseProfile("Commune en croissance démographique", "99012", 15_000, 350, {
        derived: {
          populationGrowthPercent: 12.4,
          populationGrowthFromYear: 2010,
          populationGrowthToYear: 2022,
          irvePointsPer1000Residents: null,
          socialHousingVacancyRatePercent: null,
          equipmentsPer1000Residents: 45,
          available: true,
          note: "",
        },
        populationHistory: {
          latestYear: 2022,
          latestPopulation: 15_000,
          history: [
            { year: 2010, population: 13_350 },
            { year: 2022, population: 15_000 },
          ],
          available: true,
          note: "",
        },
        sociodemographics: {
          year: 2022,
          incomeYear: 2023,
          ageBands: [],
          unemploymentRate: 8.2,
          medianDisposableIncome: 19_500,
          available: true,
          note: "",
        },
        housing: {
          year: 2022,
          totalUnits: 1_200,
          occupiedUnits: 1_150,
          vacantUnits: 50,
          totalDwellings: 7_500,
          rpVacantDwellings: 280,
          rpVacancyRatePercent: 3.7,
          socialHousingSharePercent: 12,
          vacancyRatePercent: null,
          ...HOUSING_LOVAC_ABSENT,
          available: true,
          note: "",
        },
      });
    case "moderateEmployment":
      return baseProfile("Commune emploi modéré", "99020", 10_000, 200, {
        sociodemographics: {
          year: 2022,
          incomeYear: 2023,
          ageBands: [],
          unemploymentRate: 8.2,
          medianDisposableIncome: 19_500,
          available: true,
          note: "",
        },
        housing: {
          year: 2022,
          totalUnits: 800,
          occupiedUnits: 750,
          vacantUnits: 50,
          totalDwellings: 4_200,
          rpVacantDwellings: 525,
          rpVacancyRatePercent: 12.5,
          socialHousingSharePercent: 8,
          vacancyRatePercent: null,
          ...HOUSING_LOVAC_ABSENT,
          available: true,
          note: "",
        },
        security: {
          year: 2024,
          indicators: [
            {
              id: "vols",
              label: "Vols",
              count: 120,
              ratePer1000: 12.0,
              departmentRatePer1000: 7.5,
              diffused: true,
            },
          ],
          diffusedIndicatorCount: 1,
          available: true,
          note: "",
        },
        risks: {
          radon: null,
          flood: { zones: ["Zone A"], count: 1 },
          catNatEvents: [
            { label: "Inondation et/ou Coulées de boue", startDate: "2019-03-15" },
          ],
          available: true,
          note: "",
        },
      });
    case "lowMunicipalDebt":
      return baseProfile("Commune dette faible", "99021", 10_000, 200, {
        sociodemographics: {
          year: 2022,
          incomeYear: 2023,
          ageBands: [],
          unemploymentRate: 8.2,
          medianDisposableIncome: 19_500,
          available: true,
          note: "",
        },
        publicAccounts: {
          year: 2023,
          operatingRevenueEur: null,
          operatingRevenuePerCapitaEur: null,
          debtOutstandingEur: 6_500_000,
          debtPerCapitaEur: 650,
          available: true,
          note: "",
        },
        security: {
          year: 2024,
          indicators: [
            {
              id: "vols",
              label: "Vols",
              count: 120,
              ratePer1000: 12.0,
              departmentRatePer1000: 7.5,
              diffused: true,
            },
          ],
          diffusedIndicatorCount: 1,
          available: true,
          note: "",
        },
        risks: {
          radon: null,
          flood: { zones: ["Zone A"], count: 1 },
          catNatEvents: [
            { label: "Inondation et/ou Coulées de boue", startDate: "2019-03-15" },
          ],
          available: true,
          note: "",
        },
      });
    case "highMunicipalDebt":
      return baseProfile("Commune dette élevée", "99022", 10_000, 200, {
        sociodemographics: {
          year: 2022,
          incomeYear: 2023,
          ageBands: [],
          unemploymentRate: 8.2,
          medianDisposableIncome: 19_500,
          available: true,
          note: "",
        },
        publicAccounts: {
          year: 2023,
          operatingRevenueEur: null,
          operatingRevenuePerCapitaEur: null,
          debtOutstandingEur: 18_500_000,
          debtPerCapitaEur: 1_850,
          available: true,
          note: "",
        },
        security: {
          year: 2024,
          indicators: [
            {
              id: "vols",
              label: "Vols",
              count: 120,
              ratePer1000: 12.0,
              departmentRatePer1000: 7.5,
              diffused: true,
            },
          ],
          diffusedIndicatorCount: 1,
          available: true,
          note: "",
        },
        risks: {
          radon: null,
          flood: { zones: ["Zone A"], count: 1 },
          catNatEvents: [
            { label: "Inondation et/ou Coulées de boue", startDate: "2019-03-15" },
          ],
          available: true,
          note: "",
        },
      });
    case "compositeIncomeFragility":
      return baseProfile("Commune fragilité revenu composite", "99023", 12_000, 280, {
        sociodemographics: {
          year: 2022,
          incomeYear: 2023,
          ageBands: [],
          unemploymentRate: 11.2,
          medianDisposableIncome: 18_500,
          available: true,
          note: "",
        },
        urbanPolicy: {
          year: 2024,
          hasQpv: true,
          qpvCount: 1,
          qpvLabels: ["QPV Centre"],
          available: true,
          note: "",
        },
        housing: {
          year: 2022,
          totalUnits: 900,
          occupiedUnits: 850,
          vacantUnits: 50,
          totalDwellings: 5_000,
          rpVacantDwellings: 600,
          rpVacancyRatePercent: 12.0,
          socialHousingSharePercent: 22,
          vacancyRatePercent: null,
          ...HOUSING_LOVAC_ABSENT,
          available: true,
          note: "",
        },
        security: {
          year: 2024,
          indicators: [
            {
              id: "vols",
              label: "Vols",
              count: 140,
              ratePer1000: 11.7,
              departmentRatePer1000: 7.5,
              diffused: true,
            },
          ],
          diffusedIndicatorCount: 1,
          available: true,
          note: "",
        },
        risks: {
          radon: null,
          flood: { zones: ["Zone A"], count: 1 },
          catNatEvents: [
            { label: "Inondation et/ou Coulées de boue", startDate: "2019-03-15" },
          ],
          available: true,
          note: "",
        },
      });
    case "twoNegativeEnjeux":
      return baseProfile("Commune deux enjeux défavorables", "99024", 8_000, 180, {
        sociodemographics: {
          year: 2022,
          incomeYear: 2023,
          ageBands: [],
          unemploymentRate: 11.5,
          medianDisposableIncome: 20_500,
          available: true,
          note: "",
        },
        housing: {
          year: 2022,
          totalUnits: 120,
          occupiedUnits: 115,
          vacantUnits: 5,
          totalDwellings: 3_800,
          rpVacantDwellings: 95,
          rpVacancyRatePercent: 2.5,
          socialHousingSharePercent: 10,
          vacancyRatePercent: null,
          ...HOUSING_LOVAC_ABSENT,
          available: true,
          note: "",
        },
        security: {
          year: 2024,
          indicators: [
            {
              id: "vols",
              label: "Vols",
              count: 8,
              ratePer1000: 1.0,
              departmentRatePer1000: 5.5,
              diffused: true,
            },
          ],
          diffusedIndicatorCount: 1,
          available: true,
          note: "",
        },
        risks: {
          radon: null,
          flood: { zones: ["Zone A"], count: 1 },
          catNatEvents: [
            { label: "Inondation et/ou Coulées de boue", startDate: "2020-06-01" },
          ],
          available: true,
          note: "",
        },
        publicAccounts: {
          year: 2023,
          operatingRevenueEur: null,
          operatingRevenuePerCapitaEur: null,
          debtOutstandingEur: 4_000_000,
          debtPerCapitaEur: 500,
          available: true,
          note: "",
        },
      });
    case "lowTourismCapacity":
      return baseProfile("Commune faible capacité touristique", "99025", 4_000, 110, {
        tourism: {
          year: 2025,
          accommodationPlaces: 60,
          available: true,
          note: "",
        },
      });
    case "lowEssVolume":
      return baseProfile("Commune faible volume ESS", "99026", 6_000, 150, {
        enterprises: {
          legalUnitsWithEstablishment: 120,
          legalUnitsIsCapped: false,
          essCount: 8,
          rgeCount: 3,
          inseeLegalUnits: 110,
          inseeEstablishments: 130,
          inseeSideYear: 2022,
          millesime: "2022",
          divergenceWarning: null,
          note: "",
        },
      });
    case "sireneCapped":
      return baseProfile("Commune SIRENE plafonnée", "99013", 20_000, 500, {
        enterprises: {
          legalUnitsWithEstablishment: 10_000,
          legalUnitsIsCapped: true,
          essCount: 120,
          rgeCount: 45,
          inseeLegalUnits: null,
          inseeEstablishments: null,
          inseeSideYear: null,
          millesime: "2024",
          divergenceWarning: null,
          note: "",
        },
      });
    case "fullEnrichment":
      return saintGironsProfile;
    default:
      return ruralProfileMinimal;
  }
}

export function withTerritoryTypology(
  profile: TerritoryProfile,
  typology: TerritoryTypology,
): TerritoryProfile {
  if (!profile.enrichment) {
    return profile;
  }

  return {
    ...profile,
    enrichment: {
      ...profile.enrichment,
      territoryTypology: typology,
    },
  };
}

function typologyBase(
  comparisonProfile: ComparisonProfile,
  partial: Partial<TerritoryTypology> = {},
): TerritoryTypology {
  const availableFamilies = partial.availableFamilies ?? [];
  const missingFamilies = partial.missingFamilies ?? [
    "density_grid",
    "attraction_area",
    "urban_unit",
    "public_policy",
  ].filter((family) => !availableFamilies.includes(family));

  return {
    comparisonProfile,
    availableFamilies,
    missingFamilies,
    ...partial,
  };
}

export function createTypologyProfile(
  kind:
    | "metroDense"
    | "periurban"
    | "smallCentrality"
    | "ruralSparse"
    | "horsAttraction"
    | "pvd"
    | "acv"
    | "frr"
    | "noPolicy"
    | "partialMissing",
): TerritoryProfile {
  const base = baseProfile("Commune typologie test", "99099", 12_000, 450, {});

  switch (kind) {
    case "metroDense":
      return withTerritoryTypology(
        baseProfile("Commune métropolitaine dense", "99010", 250_000, 5_500, {
          housing: {
            year: 2022,
            totalUnits: 10_000,
            occupiedUnits: 9_700,
            vacantUnits: 300,
            totalDwellings: 120_000,
            rpVacantDwellings: 8_500,
            rpVacancyRatePercent: 7.1,
            socialHousingSharePercent: 15,
            vacancyRatePercent: null,
            ...HOUSING_LOVAC_ABSENT,
            available: true,
            note: "",
          },
        }),
        typologyBase("metropole", {
          summaryLabel: "commune dense de grande agglomération",
          availableFamilies: ["density_grid", "attraction_area", "urban_unit"],
          missingFamilies: ["public_policy"],
          densityGrid: {
            levelCode: "1",
            levelLabel: "Grand centre urbain",
            simplifiedLabel: "commune très dense",
            source: "INSEE",
            vintage: 2024,
            available: true,
            note: "",
          },
          attractionArea: {
            areaCode: "001",
            areaLabel: "Aire test",
            role: "pole",
            categoryCode: "11",
            categoryLabel: "Commune-centre",
            source: "INSEE",
            vintage: 2020,
            available: true,
            note: "",
          },
          urbanUnit: {
            unitCode: "12345",
            unitLabel: "Unité test",
            belongsToUrbanUnit: true,
            role: "ville_centre",
            sizeClass: "7",
            source: "INSEE",
            vintage: 2020,
            available: true,
            note: "",
          },
        }),
      );
    case "periurban":
      return withTerritoryTypology(
        baseProfile("Commune périurbaine test", "99011", 8_000, 320, {
          mobility: {
            irve: { year: 2024, chargingPoints: 4, stations: 2, available: true, note: "" },
            commute: {
              year: 2022,
              employedCount: 3_500,
              carSharePercent: 88,
              publicTransportSharePercent: 2.5,
              available: true,
              note: "",
            },
            connectivity: {
              vintage: "2025_T4",
              fiberEligibleSharePercent: 60,
              totalPremises: 3_500,
              fiberEligiblePremises: 2_100,
              technologies: ["Fibre"],
              available: true,
              note: "",
            },
          },
        }),
        typologyBase("periurbain", {
          summaryLabel: "commune de couronne périurbaine",
          availableFamilies: ["density_grid", "attraction_area"],
          missingFamilies: ["urban_unit", "public_policy"],
          densityGrid: {
            levelCode: "4",
            levelLabel: "Ceinture urbaine",
            simplifiedLabel: "commune périurbaine",
            source: "INSEE",
            vintage: 2024,
            available: true,
            note: "",
          },
          attractionArea: {
            role: "couronne",
            categoryCode: "20",
            categoryLabel: "Commune de la couronne",
            source: "INSEE",
            vintage: 2020,
            available: true,
            note: "",
          },
        }),
      );
    case "smallCentrality":
      return withTerritoryTypology(
        baseProfile("Petite centralité test", "99012", 6_500, 180, {}),
        typologyBase("petite_centralite", {
          summaryLabel: "petite centralité",
          availableFamilies: ["density_grid", "attraction_area"],
          missingFamilies: ["urban_unit", "public_policy"],
          attractionArea: {
            role: "pole",
            categoryCode: "11",
            categoryLabel: "Commune-centre",
            source: "INSEE",
            vintage: 2020,
            available: true,
            note: "",
          },
        }),
      );
    case "ruralSparse":
      return withTerritoryTypology(
        baseProfile("Commune rurale test", "99013", 420, 16, {
          housing: {
            year: 2022,
            totalUnits: 120,
            occupiedUnits: 112,
            vacantUnits: 8,
            totalDwellings: 520,
            rpVacantDwellings: 45,
            rpVacancyRatePercent: 8.7,
            socialHousingSharePercent: 4,
            vacancyRatePercent: null,
            ...HOUSING_LOVAC_ABSENT,
            available: true,
            note: "",
          },
        }),
        typologyBase("rural_isole", {
          summaryLabel: "commune rurale peu dense",
          availableFamilies: ["density_grid", "urban_unit"],
          missingFamilies: ["attraction_area", "public_policy"],
          densityGrid: {
            levelCode: "7",
            levelLabel: "Rural à habitat très dispersé",
            simplifiedLabel: "commune rurale très peu dense",
            source: "INSEE",
            vintage: 2024,
            available: true,
            note: "",
          },
          urbanUnit: {
            belongsToUrbanUnit: false,
            role: "commune_isolee",
            source: "INSEE",
            vintage: 2020,
            available: true,
            note: "",
          },
        }),
      );
    case "horsAttraction":
      return withTerritoryTypology(
        baseProfile("Commune hors attraction", "99014", 1_100, 22, {}),
        typologyBase("rural", {
          summaryLabel: "commune hors attraction des villes",
          availableFamilies: ["attraction_area"],
          missingFamilies: ["density_grid", "urban_unit", "public_policy"],
          attractionArea: {
            role: "hors_attraction",
            categoryCode: "30",
            categoryLabel: "Commune hors attraction des villes",
            source: "INSEE",
            vintage: 2020,
            available: true,
            note: "",
          },
        }),
      );
    case "pvd":
      return withTerritoryTypology(
        baseProfile("Commune PVD test", "99015", 7_000, 95, {}),
        typologyBase("petite_centralite", {
          summaryLabel: "petite centralité",
          availableFamilies: ["public_policy"],
          missingFamilies: ["density_grid", "attraction_area", "urban_unit"],
          publicPolicyTypologies: {
            petitesVillesDeDemain: true,
            actionCoeurDeVille: false,
            franceRuralitesRevitalisation: false,
            franceRuralitesRevitalisationPlus: false,
            villagesAvenir: false,
            source: "ANCT",
            vintage: 2024,
            available: true,
            note: "",
          },
        }),
      );
    case "acv":
      return withTerritoryTypology(
        baseProfile("Commune ACV test", "99016", 28_000, 900, {}),
        typologyBase("ville_moyenne", {
          summaryLabel: "ville moyenne de centralité",
          availableFamilies: ["public_policy"],
          missingFamilies: ["density_grid", "attraction_area", "urban_unit"],
          publicPolicyTypologies: {
            petitesVillesDeDemain: false,
            actionCoeurDeVille: true,
            franceRuralitesRevitalisation: false,
            franceRuralitesRevitalisationPlus: false,
            villagesAvenir: false,
            source: "ANCT",
            vintage: 2024,
            available: true,
            note: "",
          },
        }),
      );
    case "frr":
      return withTerritoryTypology(
        baseProfile("Commune FRR test", "99017", 900, 14, {}),
        typologyBase("rural", {
          summaryLabel: "commune rurale",
          availableFamilies: ["public_policy"],
          missingFamilies: ["density_grid", "attraction_area", "urban_unit"],
          publicPolicyTypologies: {
            petitesVillesDeDemain: false,
            actionCoeurDeVille: false,
            franceRuralitesRevitalisation: true,
            franceRuralitesRevitalisationPlus: true,
            source: "ANCT",
            vintage: 2024,
            available: true,
            note: "",
          },
        }),
      );
    case "noPolicy":
      return withTerritoryTypology(
        base,
        typologyBase("unknown", {
          availableFamilies: [],
          missingFamilies: [
            "density_grid",
            "attraction_area",
            "urban_unit",
            "public_policy",
          ],
          publicPolicyTypologies: {
            petitesVillesDeDemain: false,
            actionCoeurDeVille: false,
            franceRuralitesRevitalisation: false,
            franceRuralitesRevitalisationPlus: false,
            villagesAvenir: false,
            source: "ANCT",
            vintage: 2024,
            available: true,
            note: "",
          },
        }),
      );
    case "partialMissing":
      return withTerritoryTypology(
        base,
        typologyBase("unknown", {
          availableFamilies: ["density_grid"],
          missingFamilies: ["attraction_area", "urban_unit", "public_policy"],
          densityGrid: {
            levelCode: "2",
            levelLabel: "Commune faiblement dense",
            simplifiedLabel: "commune peu dense",
            source: "INSEE",
            vintage: 2024,
            available: true,
            note: "",
          },
        }),
      );
    default:
      return base;
  }
}
