import { computeYoungAdultShare, computeAgeAggregates } from "@/lib/age-aggregates";
import {
  formatCurrency,
  formatDensity,
  formatPercent,
  formatPropertyPrice,
  formatRate,
} from "@/lib/enrichment/format";
import { formatPopulation } from "@/lib/territory";
import {
  FILOSOFI_VINTAGE,
  RP_VINTAGE,
  SOURCE_IDS,
} from "@/lib/sources";
import { formatComparisonProfile } from "@/lib/ux/typology-display";
import { isSensitiveIndicator } from "@/lib/indicators/types";
import type { TerritoryProfile } from "@/lib/types";
import type {
  CompareBlock,
  CompareIndicatorDefinition,
  CompareIndicatorExtractor,
} from "./types";

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function numericCell(
  displayValue: string,
  numericValue: number | null,
  vintage: number | string | null,
  available: boolean,
  options?: { fragile?: boolean; warning?: string | null },
): ReturnType<CompareIndicatorExtractor> {
  return {
    displayValue,
    numericValue,
    vintage,
    fragile: options?.fragile ?? false,
    warning: options?.warning ?? null,
    available,
  };
}

function textCell(
  text: string,
  vintage: number | string | null = null,
): ReturnType<CompareIndicatorExtractor> {
  return {
    displayValue: text,
    numericValue: null,
    vintage,
    fragile: false,
    warning: null,
    available: text !== "Donnée non disponible",
  };
}

function bpeDomainPer1000(
  territory: TerritoryProfile,
  domainCode: string,
): number | null {
  const equipments = territory.enrichment?.equipments;
  const population = territory.population;
  if (!equipments?.available || !population || population <= 0) {
    return null;
  }
  const domain = equipments.byDomain.find((item) => item.code === domainCode);
  if (!domain) {
    return null;
  }
  return roundOneDecimal((domain.count / population) * 1000);
}

function tourismPlacesPer1000(territory: TerritoryProfile): number | null {
  const tourism = territory.enrichment?.tourism;
  const population = territory.population;
  if (!tourism?.available || !population || population <= 0) {
    return null;
  }
  return roundOneDecimal((tourism.accommodationPlaces / population) * 1000);
}

function tourismWarning(territory: TerritoryProfile): string | null {
  const rate = tourismPlacesPer1000(territory);
  if (rate !== null && rate >= 50) {
    return "Commune à forte capacité touristique — certains ratios par habitant sont moins parlants.";
  }
  return null;
}

export const COMPARE_BLOCKS: CompareBlock[] = [
  { id: "identity", label: "Identité de la commune", indicatorIds: [] },
  { id: "population", label: "Population & familles", indicatorIds: [] },
  { id: "housing", label: "Logement & cadre résidentiel", indicatorIds: [] },
  { id: "income_employment", label: "Revenus & emploi", indicatorIds: [] },
  { id: "services", label: "Équipements & services", indicatorIds: [] },
  { id: "dynamics", label: "Dynamiques & accessibilité", indicatorIds: [] },
];

type CompareIndicatorInput = Omit<CompareIndicatorDefinition, "scale" | "sensitive">;

const RAW_COMPARE_INDICATORS: CompareIndicatorInput[] = [
  {
    id: "population",
    label: "Population",
    definition: "Population municipale au dernier recensement ou estimation INSEE.",
    blockId: "identity",
    questionIds: ["family", "territorial_context"],
    sourceId: SOURCE_IDS.GEO_API_COMMUNES,
    sourceName: "API Géo",
    valueType: "absolute",
    higherIsBetter: null,
    extract: (t) =>
      numericCell(
        formatPopulation(t.population),
        t.population,
        t.enrichment?.populationHistory?.latestYear ?? null,
        t.population !== null,
      ),
  },
  {
    id: "density",
    label: "Densité",
    definition: "Nombre d'habitants par km² (population / surface communale).",
    blockId: "identity",
    questionIds: ["territorial_context"],
    sourceId: SOURCE_IDS.GEO_API_COMMUNES,
    sourceName: "API Géo",
    valueType: "ratio",
    higherIsBetter: true,
    comparisonHint:
      "Comparez plutôt des communes de taille proche : la densité seule ne résume pas le cadre de vie.",
    extract: (t) =>
      numericCell(
        formatDensity(t.densityPerKm2),
        t.densityPerKm2,
        t.enrichment?.populationHistory?.latestYear ?? null,
        t.densityPerKm2 !== null,
      ),
  },
  {
    id: "epci",
    label: "Intercommunalité (EPCI)",
    definition: "Établissement public de coopération intercommunale de rattachement.",
    blockId: "identity",
    questionIds: ["territorial_context"],
    sourceId: SOURCE_IDS.GEO_API_COMMUNES,
    sourceName: "API Géo",
    valueType: "text",
    higherIsBetter: null,
    extract: (t) => textCell(t.epci?.name ?? "Donnée non disponible"),
  },
  {
    id: "territorial_profile",
    label: "Profil territorial",
    definition:
      "Typologie simplifiée (métropole, périurbain, rural…) dérivée de la densité et de l'aire d'attraction.",
    blockId: "identity",
    questionIds: ["territorial_context"],
    sourceId: SOURCE_IDS.INSEE_DENSITY_GRID,
    sourceName: "Typologie INSEE",
    valueType: "text",
    higherIsBetter: null,
    extract: (t) => {
      const profile = t.enrichment?.territoryTypology?.comparisonProfile;
      if (!profile || profile === "unknown") {
        return textCell("Donnée non disponible");
      }
      return textCell(formatComparisonProfile(profile));
    },
  },
  {
    id: "attraction_area",
    label: "Aire d'attraction",
    definition: "Bassin de vie / aire d'attraction des villes (AAV 2020).",
    blockId: "identity",
    questionIds: ["accessible", "territorial_context"],
    sourceId: SOURCE_IDS.AAV,
    sourceName: "INSEE AAV",
    valueType: "text",
    higherIsBetter: null,
    extract: (t) => {
      const aav = t.enrichment?.geography?.attractionArea;
      if (!aav?.available) {
        return textCell("Donnée non disponible");
      }
      return textCell(aav.label, 2020);
    },
  },
  {
    id: "share_under_30",
    label: "Part moins de 30 ans",
    definition: "Part des 0–29 ans dans la population (recensement RP).",
    blockId: "population",
    questionIds: ["family"],
    sourceId: SOURCE_IDS.INSEE_RP_POPULATION,
    sourceName: "INSEE RP",
    valueType: "ratio",
    higherIsBetter: true,
    extract: (t) => {
      const bands = t.enrichment?.sociodemographics?.ageBands ?? [];
      const share = computeYoungAdultShare(bands);
      return numericCell(
        formatPercent(share),
        share,
        t.enrichment?.sociodemographics?.year ?? RP_VINTAGE,
        share !== null,
      );
    },
  },
  {
    id: "share_60_plus",
    label: "Part 60 ans et plus",
    definition: "Part des 60 ans et plus dans la population (recensement RP).",
    blockId: "population",
    questionIds: ["family"],
    sourceId: SOURCE_IDS.INSEE_RP_POPULATION,
    sourceName: "INSEE RP",
    valueType: "ratio",
    higherIsBetter: null,
    extract: (t) => {
      const bands = t.enrichment?.sociodemographics?.ageBands ?? [];
      const aggregates = computeAgeAggregates(bands);
      return numericCell(
        formatPercent(aggregates.part60Plus),
        aggregates.part60Plus,
        t.enrichment?.sociodemographics?.year ?? RP_VINTAGE,
        aggregates.part60Plus !== null,
      );
    },
  },
  {
    id: "population_growth",
    label: "Évolution population",
    definition: "Variation en % entre la première et la dernière année de l'historique INSEE.",
    blockId: "population",
    questionIds: ["dynamic", "family"],
    sourceId: SOURCE_IDS.INSEE_POPULATION_HISTORY,
    sourceName: "INSEE",
    valueType: "evolution",
    higherIsBetter: true,
    extract: (t) => {
      const derived = t.enrichment?.derived;
      const value = derived?.populationGrowthPercent ?? null;
      const vintage =
        derived?.populationGrowthToYear ??
        t.enrichment?.populationHistory?.latestYear ??
        null;
      return numericCell(formatPercent(value), value, vintage, value !== null);
    },
  },
  {
    id: "schools_open",
    label: "Établissements scolaires",
    definition: "Nombre d'établissements ouverts (annuaire Éducation nationale, agrégats communaux).",
    blockId: "population",
    questionIds: ["family", "equipped"],
    sourceId: SOURCE_IDS.EDUCATION_DIRECTORY,
    sourceName: "Éducation nationale",
    valueType: "absolute",
    higherIsBetter: true,
    extract: (t) => {
      const education = t.enrichment?.education;
      const value = education?.available ? education.totalOpen : null;
      return numericCell(
        value !== null ? value.toLocaleString("fr-FR") : "Donnée non disponible",
        value,
        education?.year ?? null,
        value !== null,
      );
    },
  },
  {
    id: "average_ips",
    label: "Indice position sociale (IPS)",
    definition: "IPS moyen des écoles de la commune (échelle nationale ~80–170).",
    blockId: "population",
    questionIds: ["family", "socioeconomic"],
    sourceId: SOURCE_IDS.DEPP_IPS_ECOLES,
    sourceName: "Éducation nationale",
    valueType: "ratio",
    higherIsBetter: true,
    extract: (t) => {
      const education = t.enrichment?.education;
      const value = education?.averageIps ?? null;
      return numericCell(
        value !== null ? formatRate(value) : "Donnée non disponible",
        value,
        education?.ipsSchoolYear ?? null,
        value !== null,
        { fragile: (education?.schoolsWithIps ?? 0) < 3 },
      );
    },
  },
  {
    id: "total_dwellings",
    label: "Parc de logements",
    definition: "Nombre total de logements recensés (RP logement).",
    blockId: "housing",
    questionIds: ["housing"],
    sourceId: SOURCE_IDS.INSEE_RP_HOUSING,
    sourceName: "INSEE RP",
    valueType: "absolute",
    higherIsBetter: null,
    extract: (t) => {
      const housing = t.enrichment?.housing;
      const value = housing?.totalDwellings ?? null;
      return numericCell(
        value !== null ? value.toLocaleString("fr-FR") : "Donnée non disponible",
        value,
        housing?.year ?? RP_VINTAGE,
        value !== null,
      );
    },
  },
  {
    id: "rp_vacancy_rate",
    label: "Taux de vacance (RP)",
    definition: "Logements vacants / parc total (recensement RP).",
    blockId: "housing",
    questionIds: ["housing"],
    sourceId: SOURCE_IDS.INSEE_RP_HOUSING,
    sourceName: "INSEE RP",
    valueType: "ratio",
    higherIsBetter: false,
    extract: (t) => {
      const housing = t.enrichment?.housing;
      const value = housing?.rpVacancyRatePercent ?? null;
      return numericCell(
        formatPercent(value),
        value,
        housing?.year ?? RP_VINTAGE,
        value !== null,
      );
    },
  },
  {
    id: "owner_occupied_share",
    label: "Propriétaires occupants (RP)",
    definition:
      "Part des résidences principales occupées par des propriétaires (recensement RP).",
    blockId: "housing",
    questionIds: ["housing"],
    sourceId: SOURCE_IDS.INSEE_RP_HOUSING,
    sourceName: "INSEE RP",
    valueType: "ratio",
    higherIsBetter: null,
    extract: (t) => {
      const housing = t.enrichment?.housing;
      const value = housing?.ownerOccupiedPrimarySharePercent ?? null;
      return numericCell(
        formatPercent(value),
        value,
        housing?.year ?? RP_VINTAGE,
        value !== null,
      );
    },
  },
  {
    id: "secondary_residence_share",
    label: "Résidences secondaires",
    definition:
      "Part de résidences secondaires et logements occasionnels dans le parc total (RP).",
    blockId: "housing",
    questionIds: ["housing"],
    sourceId: SOURCE_IDS.INSEE_RP_HOUSING,
    sourceName: "INSEE RP",
    valueType: "ratio",
    higherIsBetter: null,
    extract: (t) => {
      const housing = t.enrichment?.housing;
      const value = housing?.secondaryResidenceSharePercent ?? null;
      const warning =
        value !== null && value >= 20
          ? "Forte part de résidences secondaires — interpréter les ratios par habitant avec prudence."
          : tourismWarning(t);
      return numericCell(
        formatPercent(value),
        value,
        housing?.year ?? RP_VINTAGE,
        value !== null,
        { warning },
      );
    },
  },
  {
    id: "social_housing_share",
    label: "Part logements sociaux",
    definition: "Logements sociaux (RPLS) rapportés au parc total (RP).",
    blockId: "housing",
    questionIds: ["housing", "socioeconomic"],
    sourceId: SOURCE_IDS.RPLS,
    sourceName: "RPLS",
    valueType: "ratio",
    higherIsBetter: null,
    extract: (t) => {
      const housing = t.enrichment?.housing;
      const value = housing?.socialHousingSharePercent ?? null;
      return numericCell(
        formatPercent(value),
        value,
        housing?.year ?? null,
        value !== null,
      );
    },
  },
  {
    id: "price_per_m2",
    label: "Prix moyen au m²",
    definition: "Prix moyen au m² des mutations DVF (dernière année disponible).",
    blockId: "housing",
    questionIds: ["housing"],
    sourceId: SOURCE_IDS.DVF,
    sourceName: "DVF",
    valueType: "absolute",
    higherIsBetter: false,
    extract: (t) => {
      const property = t.enrichment?.property;
      const value = property?.averagePricePerM2 ?? null;
      return numericCell(
        formatPropertyPrice(value, property?.mutationCount ?? null),
        value,
        property?.year ?? null,
        value !== null,
        {
          fragile: (property?.mutationCount ?? 0) < 10,
          warning:
            (property?.mutationCount ?? 0) < 10
              ? "Peu de ventes enregistrées — prix peu robuste."
              : null,
        },
      );
    },
  },
  {
    id: "median_income",
    label: "Revenu disponible médian",
    definition: "Niveau de vie médian par unité de consommation (FILOSOFI, en euros).",
    blockId: "income_employment",
    questionIds: ["socioeconomic"],
    sourceId: SOURCE_IDS.INSEE_FILOSOFI,
    sourceName: "INSEE FILOSOFI",
    valueType: "absolute",
    higherIsBetter: true,
    readingAlert:
      "Filosofi 2 (2023+) n'est pas directement comparable aux millésimes 2012-2021.",
    comparisonHint: "Privilégiez des communes du même type urbain/rural pour la lecture des revenus.",
    extract: (t) => {
      const socio = t.enrichment?.sociodemographics;
      const value = socio?.medianDisposableIncome ?? null;
      return numericCell(
        formatCurrency(value),
        value,
        socio?.incomeYear ?? FILOSOFI_VINTAGE,
        value !== null,
      );
    },
  },
  {
    id: "unemployment_rate",
    label: "Taux de chômage",
    definition: "Part des 15–64 ans au chômage au sens du recensement (RP emploi).",
    blockId: "income_employment",
    questionIds: ["socioeconomic"],
    sourceId: SOURCE_IDS.INSEE_RP_EMPLOYMENT,
    sourceName: "INSEE RP",
    valueType: "ratio",
    higherIsBetter: false,
    extract: (t) => {
      const socio = t.enrichment?.sociodemographics;
      const value = socio?.unemploymentRate ?? null;
      return numericCell(
        formatPercent(value),
        value,
        socio?.year ?? RP_VINTAGE,
        value !== null,
      );
    },
  },
  {
    id: "salaried_posts",
    label: "Emplois salariés",
    definition: "Effectifs salariés totaux (FLORES A17, secteurs privé et public).",
    blockId: "income_employment",
    questionIds: ["socioeconomic", "dynamic"],
    sourceId: SOURCE_IDS.INSEE_FLORES,
    sourceName: "INSEE FLORES",
    valueType: "absolute",
    higherIsBetter: true,
    extract: (t) => {
      const sectors = t.enrichment?.employmentSectors;
      const value = sectors?.available ? sectors.totalSalariedPosts : null;
      return numericCell(
        value !== null ? value.toLocaleString("fr-FR") : "Donnée non disponible",
        value,
        sectors?.year ?? null,
        value !== null,
      );
    },
  },
  {
    id: "enterprises",
    label: "Établissements actifs",
    definition: "Nombre d'établissements recensés (INSEE SIDE).",
    blockId: "income_employment",
    questionIds: ["dynamic", "socioeconomic"],
    sourceId: SOURCE_IDS.INSEE_SIDE,
    sourceName: "INSEE SIDE",
    valueType: "absolute",
    higherIsBetter: true,
    extract: (t) => {
      const ent = t.enrichment?.enterprises;
      const value = ent?.inseeEstablishments ?? null;
      return numericCell(
        value !== null ? value.toLocaleString("fr-FR") : "Donnée non disponible",
        value,
        ent?.inseeSideYear ?? null,
        value !== null,
      );
    },
  },
  {
    id: "rsa_share",
    label: "Part ménages allocataires RSA",
    definition: "Part des ménages percevant le RSA (CNAF, indicateurs territoriaux).",
    blockId: "income_employment",
    questionIds: ["socioeconomic"],
    sourceId: SOURCE_IDS.CNAF_PRECARITE,
    sourceName: "CNAF",
    valueType: "ratio",
    higherIsBetter: false,
    readingAlert: "Indicateur sensible — à interpréter avec prudence, sans stigmatisation.",
    comparisonHint: "Croisez avec le revenu médian et le taux de chômage pour une lecture équilibrée.",
    extract: (t) => {
      const benefits = t.enrichment?.socialBenefits;
      const value = benefits?.rsaShareAmongHouseholdsPercent ?? null;
      return numericCell(
        formatPercent(value),
        value,
        benefits?.rsaVintage ?? null,
        value !== null,
        { fragile: true },
      );
    },
  },
  {
    id: "equipments_per_1000",
    label: "Équipements / 1 000 hab.",
    definition: "Nombre d'équipements BPE (commerces, santé, sport…) pour 1 000 habitants.",
    blockId: "services",
    questionIds: ["equipped"],
    sourceId: SOURCE_IDS.INSEE_BPE,
    sourceName: "INSEE BPE",
    valueType: "ratio",
    higherIsBetter: true,
    extract: (t) => {
      const value = t.enrichment?.derived?.equipmentsPer1000Residents ?? null;
      const warning = tourismWarning(t);
      return numericCell(
        value !== null ? formatRate(value) : "Donnée non disponible",
        value,
        t.enrichment?.equipments?.year ?? null,
        value !== null,
        { warning },
      );
    },
  },
  {
    id: "health_per_1000",
    label: "Établissements santé / 1 000 hab.",
    definition: "Établissements sanitaires et sociaux (FINESS) pour 1 000 habitants.",
    blockId: "services",
    questionIds: ["equipped"],
    sourceId: SOURCE_IDS.FINESS,
    sourceName: "FINESS",
    valueType: "ratio",
    higherIsBetter: true,
    extract: (t) => {
      const health = t.enrichment?.health;
      const population = t.population;
      const total = health?.available ? health.totalEstablishments : null;
      const value =
        total !== null && population && population > 0
          ? roundOneDecimal((total / population) * 1000)
          : null;
      return numericCell(
        value !== null ? formatRate(value) : "Donnée non disponible",
        value,
        health?.year ?? null,
        value !== null,
      );
    },
  },
  {
    id: "commerce_per_1000",
    label: "Commerces / 1 000 hab.",
    definition: "Équipements commerciaux BPE (domaine B) pour 1 000 habitants.",
    blockId: "services",
    questionIds: ["equipped"],
    sourceId: SOURCE_IDS.INSEE_BPE,
    sourceName: "INSEE BPE",
    valueType: "ratio",
    higherIsBetter: true,
    extract: (t) => {
      const value = bpeDomainPer1000(t, "B");
      return numericCell(
        value !== null ? formatRate(value) : "Donnée non disponible",
        value,
        t.enrichment?.equipments?.year ?? null,
        value !== null,
        { warning: tourismWarning(t) },
      );
    },
  },
  {
    id: "sport_culture_per_1000",
    label: "Sport & culture / 1 000 hab.",
    definition: "Équipements sport, loisirs et culture BPE (domaine F) pour 1 000 habitants.",
    blockId: "services",
    questionIds: ["equipped"],
    sourceId: SOURCE_IDS.INSEE_BPE,
    sourceName: "INSEE BPE",
    valueType: "ratio",
    higherIsBetter: true,
    extract: (t) => {
      const value = bpeDomainPer1000(t, "F");
      return numericCell(
        value !== null ? formatRate(value) : "Donnée non disponible",
        value,
        t.enrichment?.equipments?.year ?? null,
        value !== null,
      );
    },
  },
  {
    id: "france_services",
    label: "Points France Services",
    definition: "Structures labellisées France Services sur la commune.",
    blockId: "services",
    questionIds: ["equipped"],
    sourceId: SOURCE_IDS.FRANCE_SERVICES,
    sourceName: "France Services",
    valueType: "absolute",
    higherIsBetter: true,
    extract: (t) => {
      const services = t.enrichment?.proximityServices;
      const value = services?.available ? services.franceServicesCount : null;
      return numericCell(
        value !== null ? String(value) : "Donnée non disponible",
        value,
        services?.year ?? null,
        value !== null,
      );
    },
  },
  {
    id: "car_commute_share",
    label: "Actifs en voiture",
    definition: "Part des actifs en emploi utilisant la voiture pour se rendre au travail (RP mobilité).",
    blockId: "dynamics",
    questionIds: ["accessible"],
    sourceId: SOURCE_IDS.INSEE_RP_COMMUTE,
    sourceName: "INSEE RP",
    valueType: "ratio",
    higherIsBetter: false,
    extract: (t) => {
      const commute = t.enrichment?.mobility?.commute;
      const value = commute?.available ? commute.carSharePercent : null;
      return numericCell(
        formatPercent(value ?? null),
        value ?? null,
        commute?.year ?? RP_VINTAGE,
        value !== null,
      );
    },
  },
  {
    id: "public_transport_share",
    label: "Actifs en transports en commun",
    definition: "Part des actifs utilisant les transports en commun pour le domicile-travail (RP).",
    blockId: "dynamics",
    questionIds: ["accessible"],
    sourceId: SOURCE_IDS.INSEE_RP_COMMUTE,
    sourceName: "INSEE RP",
    valueType: "ratio",
    higherIsBetter: true,
    extract: (t) => {
      const commute = t.enrichment?.mobility?.commute;
      const value = commute?.available ? commute.publicTransportSharePercent : null;
      return numericCell(
        formatPercent(value ?? null),
        value ?? null,
        commute?.year ?? RP_VINTAGE,
        value !== null,
      );
    },
  },
  {
    id: "fiber_eligible_share",
    label: "Éligibilité fibre",
    definition: "Part des locaux éligibles à la fibre (ARCEP Mon Réseau Mobile).",
    blockId: "dynamics",
    questionIds: ["accessible", "equipped"],
    sourceId: SOURCE_IDS.ARCEP_FIBRE,
    sourceName: "ARCEP",
    valueType: "ratio",
    higherIsBetter: true,
    extract: (t) => {
      const connectivity = t.enrichment?.mobility?.connectivity;
      const value = connectivity?.available
        ? connectivity.fiberEligibleSharePercent
        : null;
      return numericCell(
        formatPercent(value ?? null),
        value ?? null,
        connectivity?.vintage ?? null,
        value !== null,
      );
    },
  },
  {
    id: "epci_population_rank",
    label: "Rang population (EPCI)",
    definition: "Classement par population au sein de l'intercommunalité.",
    blockId: "dynamics",
    questionIds: ["dynamic", "territorial_context"],
    sourceId: SOURCE_IDS.GEO_API_COMMUNES,
    sourceName: "API Géo",
    valueType: "rank",
    higherIsBetter: null,
    extract: (t) => {
      const epci = t.enrichment?.geography?.epciComparison;
      const rank = epci?.communeRankByPopulation ?? null;
      const total = epci?.communeCount ?? null;
      const display =
        rank !== null && total !== null ? `${rank} / ${total}` : "Donnée non disponible";
      return numericCell(display, rank, null, rank !== null);
    },
  },
];

export const COMPARE_INDICATORS: CompareIndicatorDefinition[] = RAW_COMPARE_INDICATORS.map(
  (item) => ({
    ...item,
    scale: "commune",
    sensitive: isSensitiveIndicator(item.id),
  }),
);

for (const block of COMPARE_BLOCKS) {
  block.indicatorIds = COMPARE_INDICATORS.filter((item) => item.blockId === block.id).map(
    (item) => item.id,
  );
}

export const COMPARE_INDICATOR_MAP = new Map(
  COMPARE_INDICATORS.map((item) => [item.id, item]),
);
