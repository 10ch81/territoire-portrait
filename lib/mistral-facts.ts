import { computeAgeAggregates } from "./age-aggregates";
import { RP_VINTAGE } from "./sources";
import { getPopulationDisplayMeta } from "./ux/population";
import type {
  AttractionAreaSnapshot,
  DerivedIndicatorsSnapshot,
  EpciComparisonSnapshot,
  RadonRisk,
  TerritoryProfile,
} from "./types";

export interface TerritorialFacts {
  nom: string;
  codeInsee: string;
  codesPostaux: string[];
  departement: TerritoryProfile["department"];
  region: TerritoryProfile["region"];
  epci: TerritoryProfile["epci"];
  populationLegale: number | null;
  populationMillesime: number | null;
  definitionPopulation: string;
  notesPopulation: string[];
  densiteHabKm2: number | null;
  coordonnees: TerritoryProfile["coordinates"];
  surfaceKm2: number | null;
  evolutionDemographique: Array<{ year: number; population: number }> | null;
  structureParAge: {
    tranches: Array<{
      label: string;
      population: number;
      sharePercent: number | null;
    }>;
    aggregatsAge: {
      soixanteQuatorze: number | null;
      soixanteQuinzeQuatreVingtNeuf: number | null;
      quatreVingtDixPlus: number | null;
      soixantePlus: number | null;
      fiable: boolean;
      note: string;
    } | null;
    tauxChomage1564: number | null;
    revenuMedianDisponible: number | null;
    millesimeFilosofi: number | null;
    note: string;
  } | null;
  entreprises: {
    referenceStatistique: {
      source: string;
      annee: number | null;
      unitesLegales: number | null;
      etablissements: number | null;
    };
    complementAdministratif: {
      source: string;
      unitesLegalesAvecEtablissement: number | null;
      totalPlafonneApi: boolean;
      ess: number | null;
      rge: number | null;
    };
    avertissementDivergenceSireneSide: string | null;
    note: string;
  } | null;
  equipements: {
    annee: number;
    total: number;
    resumeQualitatif: string;
    semantiqueDomaines: {
      metrique: string;
      recomposeLeTotal: boolean;
      domainesPresents: string[];
    };
    principauxTypesPartiels: Array<{ code: string; label: string; count: number }>;
    transports: {
      totalEquipments: number;
      byType: Array<{ code: string; label: string; count: number }>;
      available: boolean;
      note: string;
    };
    note: string;
  } | null;
  risques: {
    radon: RadonRisk | null;
    inondation: { zones: string[]; count: number } | null;
    catnat: Array<{ label: string; startDate: string | null }>;
    note: string;
  } | null;
  securite: {
    annee: number;
    indicateurs: Array<{
      id: string;
      label: string;
      count: number | null;
      ratePer1000: number | null;
      departmentRatePer1000: number | null;
      diffused: boolean;
    }>;
    indicateursDiffuses: number;
    note: string;
  } | null;
  logementsSociaux: {
    annee: number;
    parcTotal: number | null;
    loues: number | null;
    vacantsRpls: number | null;
    parcLogementsGlobal: number | null;
    vacantsRp: number | null;
    tauxVacanceRp: number | null;
    partDuParcGlobal: number | null;
    tauxVacanceRpls: number | null;
    lovac: {
      millesime: number | null;
      vacantsParcPrive: number | null;
      tauxVacanceParcPrive: number | null;
      vacantsStructurels: number | null;
      note: string | null;
    } | null;
    note: string;
  } | null;
  emploiSalarie: {
    source: string;
    annee: number;
    etablissements: number;
    postesSalaries: number;
    secteursA17: Array<{
      code: string;
      label: string;
      establishments: number;
      salariedPosts: number;
    }>;
    note: string;
  } | null;
  sante: {
    finess: {
      etablissements: number;
      categories: Array<{ code: string; label: string; count: number }>;
      types: Array<{ code: string; label: string; count: number }>;
      note: string;
    };
  } | null;
  scolarisation: {
    etablissementsOuverts: number;
    parSecteur: Array<{ code: string; label: string; count: number }>;
    parNiveau: Array<{ code: string; label: string; count: number }>;
    note: string;
  } | null;
  mobilite: {
    irve: { pointsDeCharge: number; stations: number } | null;
    domicileTravail: {
      actifsOccupes: number | null;
      partVoiture: number | null;
      partTransportsCommun: number | null;
    } | null;
    connectiviteFixe: {
      millesime: string;
      partLocauxRaccordablesFibre: number | null;
      technologies: string[];
      note: string;
    } | null;
    note: string;
  } | null;
  politiqueVille: {
    qpv: boolean;
    nombreQpv: number;
    libelles: string[];
    note: string;
  } | null;
  fiscalite: {
    annee: number;
    tauxTfb: number | null;
    tauxTfnb: number | null;
    note: string;
  } | null;
  comptesPublics: {
    annee: number;
    recettesFonctionnement: number | null;
    recettesParHabitant: number | null;
    encoursDette: number | null;
    detteParHabitant: number | null;
    epargneBrute: number | null;
    epargneBruteParHabitant: number | null;
    annuiteDette: number | null;
    annuiteDetteParHabitant: number | null;
    note: string;
  } | null;
  servicesProximite: {
    franceServices: number;
    structures: string[];
    note: string;
  } | null;
  tourisme: {
    annee: number;
    placesHebergement: number;
    note: string;
  } | null;
  geographie: {
    aireAttraction: AttractionAreaSnapshot | null;
    comparatifEpci: EpciComparisonSnapshot | null;
    centraliteTerritoriale: {
      qualificationRecommandee: string;
      centraliteDepartementale: boolean;
      note: string;
    } | null;
  };
  immobilier: {
    annee: number;
    prixM2Moyen: number | null;
    prixMoyenMutation: number | null;
    mutations: number | null;
    mutationsMaisons: number | null;
    mutationsAppartements: number | null;
    serieHistorique: Array<{
      year: number;
      averagePricePerM2: number | null;
      mutationCount: number | null;
    }>;
    prixM2MoyenDepartement: number | null;
    note: string;
  } | null;
  indicateursDerives: DerivedIndicatorsSnapshot | null;
  sources: string[];
}

export function buildTerritorialFacts(territory: TerritoryProfile): TerritorialFacts {
  const populationMeta = getPopulationDisplayMeta(territory);
  const sociodemographics = territory.enrichment?.sociodemographics;
  const ageBands = sociodemographics?.available ? sociodemographics.ageBands : [];
  const ageAggregates = ageBands.length > 0 ? computeAgeAggregates(ageBands) : null;
  const epciRank = territory.enrichment?.geography?.epciComparison?.communeRankByPopulation;
  const isAavCentre = territory.enrichment?.geography?.attractionArea?.categoryLabel
    ?.toLowerCase()
    .includes("commune-centre");

  const territorialCentralityPhrase =
    epciRank === 1
      ? "commune-centre de l'EPCI"
      : isAavCentre
        ? "commune-centre de son bassin territorial"
        : "commune-centre de son bassin territorial";

  return {
    nom: territory.name,
    codeInsee: territory.inseeCode,
    codesPostaux: territory.postalCodes,
    departement: territory.department,
    region: territory.region,
    epci: territory.epci,
    populationLegale: territory.population,
    populationMillesime: populationMeta.vintage,
    definitionPopulation: populationMeta.definition,
    notesPopulation: populationMeta.consistencyNotes,
    densiteHabKm2: territory.densityPerKm2,
    coordonnees: territory.coordinates,
    surfaceKm2: territory.surfaceKm2,
    evolutionDemographique: territory.enrichment?.populationHistory?.available
      ? territory.enrichment.populationHistory.history
      : null,
    structureParAge: sociodemographics?.available
      ? {
          tranches: ageBands,
          aggregatsAge: ageAggregates
            ? {
                soixanteQuatorze: ageAggregates.part60_74,
                soixanteQuinzeQuatreVingtNeuf: ageAggregates.part75_89,
                quatreVingtDixPlus: ageAggregates.part90Plus,
                soixantePlus: ageAggregates.part60Plus,
                fiable: ageAggregates.reliable,
                note:
                  ageAggregates.reliable
                    ? `60 ans et plus = somme des parts 60-74, 75-89 et 90+ (recensement ${RP_VINTAGE}).`
                    : "Agrégat 60 ans et plus non fiable : tranches 60-74, 75-89 et 90+ incomplètes.",
              }
            : null,
          tauxChomage1564: sociodemographics.unemploymentRate,
          revenuMedianDisponible: sociodemographics.medianDisposableIncome,
          millesimeFilosofi: sociodemographics.incomeYear,
          note: sociodemographics.note,
        }
      : null,
    entreprises: territory.enrichment?.enterprises
      ? {
          referenceStatistique: {
            source: "INSEE SIDE",
            annee: territory.enrichment.enterprises.inseeSideYear,
            unitesLegales: territory.enrichment.enterprises.inseeLegalUnits,
            etablissements: territory.enrichment.enterprises.inseeEstablishments,
          },
          complementAdministratif: {
            source: "API SIRENE",
            unitesLegalesAvecEtablissement:
              territory.enrichment.enterprises.legalUnitsWithEstablishment,
            totalPlafonneApi: territory.enrichment.enterprises.legalUnitsIsCapped,
            ess: territory.enrichment.enterprises.essCount,
            rge: territory.enrichment.enterprises.rgeCount,
          },
          avertissementDivergenceSireneSide:
            territory.enrichment.enterprises.divergenceWarning,
          note: territory.enrichment.enterprises.note,
        }
      : null,
    emploiSalarie: territory.enrichment?.employmentSectors?.available
      ? {
          source: "INSEE FLORES",
          annee: territory.enrichment.employmentSectors.year,
          etablissements: territory.enrichment.employmentSectors.totalEstablishments,
          postesSalaries: territory.enrichment.employmentSectors.totalSalariedPosts,
          secteursA17: territory.enrichment.employmentSectors.sectors.slice(0, 8),
          note: territory.enrichment.employmentSectors.note,
        }
      : null,
    sante: territory.enrichment?.health?.available
      ? {
          finess: {
            etablissements: territory.enrichment.health.totalEstablishments,
            categories: territory.enrichment.health.byCategory.slice(0, 6),
            types: territory.enrichment.health.byType.slice(0, 6),
            note: territory.enrichment.health.note,
          },
        }
      : null,
    scolarisation: territory.enrichment?.education?.available
      ? {
          etablissementsOuverts: territory.enrichment.education.totalOpen,
          parSecteur: territory.enrichment.education.bySector,
          parNiveau: territory.enrichment.education.byLevel.slice(0, 6),
          note: territory.enrichment.education.note,
        }
      : null,
    equipements: territory.enrichment?.equipments?.available
      ? {
          annee: territory.enrichment.equipments.year,
          total: territory.enrichment.equipments.totalEquipments,
          resumeQualitatif: territory.enrichment.equipments.qualitativeSummary,
          semantiqueDomaines: {
            metrique: "nombre de types par domaine (ne recompose pas le total)",
            recomposeLeTotal: false,
            domainesPresents: territory.enrichment.equipments.byDomain.map(
              (domain) => domain.label,
            ),
          },
          principauxTypesPartiels: territory.enrichment.equipments.byType,
          transports: territory.enrichment.equipments.transport,
          note: territory.enrichment.equipments.note,
        }
      : null,
    risques: territory.enrichment?.risks?.available
      ? {
          radon: territory.enrichment.risks.radon,
          inondation: territory.enrichment.risks.flood,
          catnat: territory.enrichment.risks.catNatEvents,
          note: territory.enrichment.risks.note,
        }
      : null,
    securite: territory.enrichment?.security?.available
      ? {
          annee: territory.enrichment.security.year,
          indicateurs: territory.enrichment.security.indicators.filter(
            (indicator) => indicator.diffused,
          ),
          indicateursDiffuses: territory.enrichment.security.diffusedIndicatorCount,
          note: territory.enrichment.security.note,
        }
      : null,
    logementsSociaux: territory.enrichment?.housing?.available
      ? {
          annee: territory.enrichment.housing.year,
          parcTotal: territory.enrichment.housing.totalUnits,
          loues: territory.enrichment.housing.occupiedUnits,
          vacantsRpls: territory.enrichment.housing.vacantUnits,
          parcLogementsGlobal: territory.enrichment.housing.totalDwellings,
          vacantsRp: territory.enrichment.housing.rpVacantDwellings,
          tauxVacanceRp: territory.enrichment.housing.rpVacancyRatePercent,
          partDuParcGlobal: territory.enrichment.housing.socialHousingSharePercent,
          tauxVacanceRpls: territory.enrichment.housing.vacancyRatePercent,
          lovac: territory.enrichment.housing.privateVacantDwellings !== null
            ? {
                millesime: territory.enrichment.housing.lovacVintage,
                vacantsParcPrive: territory.enrichment.housing.privateVacantDwellings,
                tauxVacanceParcPrive:
                  territory.enrichment.housing.privateVacancyRatePercent,
                vacantsStructurels:
                  territory.enrichment.housing.privateVacantStructural,
                note: territory.enrichment.housing.lovacNote,
              }
            : null,
          note: territory.enrichment.housing.note,
        }
      : null,
    mobilite: territory.enrichment?.mobility
      ? {
          irve: territory.enrichment.mobility.irve.available
            ? {
                pointsDeCharge: territory.enrichment.mobility.irve.chargingPoints,
                stations: territory.enrichment.mobility.irve.stations,
              }
            : null,
          domicileTravail: territory.enrichment.mobility.commute.available
            ? {
                actifsOccupes: territory.enrichment.mobility.commute.employedCount,
                partVoiture: territory.enrichment.mobility.commute.carSharePercent,
                partTransportsCommun:
                  territory.enrichment.mobility.commute.publicTransportSharePercent,
              }
            : null,
          connectiviteFixe: territory.enrichment.mobility.connectivity.available
            ? {
                millesime: territory.enrichment.mobility.connectivity.vintage,
                partLocauxRaccordablesFibre:
                  territory.enrichment.mobility.connectivity.fiberEligibleSharePercent,
                technologies: territory.enrichment.mobility.connectivity.technologies,
                note: territory.enrichment.mobility.connectivity.note,
              }
            : null,
          note: [
            territory.enrichment.mobility.irve.note,
            territory.enrichment.mobility.commute.note,
            territory.enrichment.mobility.connectivity.note,
          ]
            .filter(Boolean)
            .join(" "),
        }
      : null,
    politiqueVille: territory.enrichment?.urbanPolicy?.available
      ? {
          qpv: territory.enrichment.urbanPolicy.hasQpv,
          nombreQpv: territory.enrichment.urbanPolicy.qpvCount,
          libelles: territory.enrichment.urbanPolicy.qpvLabels,
          note: territory.enrichment.urbanPolicy.note,
        }
      : null,
    fiscalite: territory.enrichment?.fiscal?.available
      ? {
          annee: territory.enrichment.fiscal.year,
          tauxTfb: territory.enrichment.fiscal.propertyTaxBuiltRate,
          tauxTfnb: territory.enrichment.fiscal.propertyTaxUnbuiltRate,
          note: territory.enrichment.fiscal.note,
        }
      : null,
    comptesPublics: territory.enrichment?.publicAccounts?.available
      ? {
          annee: territory.enrichment.publicAccounts.year,
          recettesFonctionnement: territory.enrichment.publicAccounts.operatingRevenueEur,
          recettesParHabitant:
            territory.enrichment.publicAccounts.operatingRevenuePerCapitaEur,
          encoursDette: territory.enrichment.publicAccounts.debtOutstandingEur,
          detteParHabitant: territory.enrichment.publicAccounts.debtPerCapitaEur,
          epargneBrute: territory.enrichment.publicAccounts.grossSavingsEur,
          epargneBruteParHabitant:
            territory.enrichment.publicAccounts.grossSavingsPerCapitaEur,
          annuiteDette: territory.enrichment.publicAccounts.debtServiceEur,
          annuiteDetteParHabitant:
            territory.enrichment.publicAccounts.debtServicePerCapitaEur,
          note: territory.enrichment.publicAccounts.note,
        }
      : null,
    servicesProximite: territory.enrichment?.proximityServices?.available
      ? {
          franceServices: territory.enrichment.proximityServices.franceServicesCount,
          structures: territory.enrichment.proximityServices.structureLabels,
          note: territory.enrichment.proximityServices.note,
        }
      : null,
    tourisme: territory.enrichment?.tourism?.available
      ? {
          annee: territory.enrichment.tourism.year,
          placesHebergement: territory.enrichment.tourism.accommodationPlaces,
          note: territory.enrichment.tourism.note,
        }
      : null,
    geographie: {
      aireAttraction: territory.enrichment?.geography?.attractionArea?.available
        ? territory.enrichment.geography.attractionArea
        : null,
      comparatifEpci: territory.enrichment?.geography?.epciComparison?.available
        ? territory.enrichment.geography.epciComparison
        : null,
      centraliteTerritoriale: {
        qualificationRecommandee: territorialCentralityPhrase,
        centraliteDepartementale: false,
        note:
          "Ne pas qualifier une commune de « commune-centre de [département] » sans centralité départementale explicite.",
      },
    },
    immobilier: territory.enrichment?.property?.available
      ? {
          annee: territory.enrichment.property.year,
          prixM2Moyen: territory.enrichment.property.averagePricePerM2,
          prixMoyenMutation: territory.enrichment.property.averageTransactionPrice,
          mutations: territory.enrichment.property.mutationCount,
          mutationsMaisons: territory.enrichment.property.houseMutations,
          mutationsAppartements: territory.enrichment.property.apartmentMutations,
          serieHistorique: territory.enrichment.property.priceHistory,
          prixM2MoyenDepartement:
            territory.enrichment.property.departmentAveragePricePerM2,
          note: territory.enrichment.property.note,
        }
      : null,
    indicateursDerives: territory.enrichment?.derived?.available
      ? territory.enrichment.derived
      : null,
    sources: territory.sources.map((source) => source.name),
  };
}
