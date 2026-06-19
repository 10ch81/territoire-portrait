import { computePopulationGrowthFromHistory } from "../../demographic-indicators";
import type { TerritoryProfile } from "../../types";
import { aavRoleFromCategoryCode } from "../../typology/labels";
import {
  SMALL_COMMUNE_POPULATION_THRESHOLD,
  resolveComparisonProfile,
} from "../../typology/thresholds";

/** Flag déductible ; `null` si les données nécessaires sont absentes. */
export type TerritoryContextFlag = boolean | null;

export type TerritoryContext = {
  isSmallPopulation: TerritoryContextFlag;
  isDenseUrban: TerritoryContextFlag;
  isCentralityInEpci: TerritoryContextFlag;
  isTouristCommune: TerritoryContextFlag;
  isMountainOrNaturalRiskCommune: TerritoryContextFlag;
  hasStrongPopulationGrowth: TerritoryContextFlag;
  hasPopulationDecline: TerritoryContextFlag;
  hasHighRealEstatePressure: TerritoryContextFlag;
  hasHighEmploymentBase: TerritoryContextFlag;
  hasHighTourismCapacityPerResident: TerritoryContextFlag;
  requiresPerCapitaCaution: TerritoryContextFlag;
};

export const STRONG_POPULATION_GROWTH_THRESHOLD_PERCENT = 10;
export const HIGH_TOURISM_CAPACITY_PER_RESIDENT_RATIO = 0.4;
export const TOURIST_COMMUNE_MIN_ACCOMMODATION_PLACES = 200;
export const DENSE_URBAN_DENSITY_THRESHOLD_PER_KM2 = 500;
export const HIGH_EMPLOYMENT_BASE_POSTS_PER_RESIDENT = 0.35;
export const HIGH_REAL_ESTATE_PREMIUM_RATIO = 1.15;
export const EPCI_CENTRALITY_MAX_RANK = 3;
export const PER_CAPITA_CAUTION_TOURISM_RATIO = 0.15;
export const PER_CAPITA_CAUTION_MIN_ACCOMMODATION_PLACES = 500;

export function tourismAccommodationRatio(territory: TerritoryProfile): number | null {
  const places = territory.enrichment?.tourism?.accommodationPlaces;
  const population = territory.population;

  if (places == null || population == null || population <= 0) {
    return null;
  }

  return places / population;
}

function resolvePopulationGrowthPercent(territory: TerritoryProfile): number | null {
  const derived = territory.enrichment?.derived?.populationGrowthPercent;
  if (derived != null) {
    return derived;
  }

  const computed = computePopulationGrowthFromHistory(
    territory.enrichment?.populationHistory?.history,
  );
  return computed.percent;
}

function resolveIsDenseUrban(territory: TerritoryProfile): TerritoryContextFlag {
  const profile = resolveComparisonProfile(territory);
  if (profile === "metropole" || profile === "grande_ville") {
    return true;
  }

  const densityGridCode = territory.enrichment?.territoryTypology?.densityGrid?.levelCode;
  if (densityGridCode === "1" || densityGridCode === "2") {
    return true;
  }

  if (territory.densityPerKm2 == null) {
    return densityGridCode != null ? false : null;
  }

  return territory.densityPerKm2 >= DENSE_URBAN_DENSITY_THRESHOLD_PER_KM2;
}

function resolveIsCentralityInEpci(territory: TerritoryProfile): TerritoryContextFlag {
  const comparison = territory.enrichment?.geography?.epciComparison;
  if (!comparison?.available) {
    return null;
  }

  const rank = comparison.communeRankByPopulation;
  if (rank == null) {
    return null;
  }

  return rank <= EPCI_CENTRALITY_MAX_RANK;
}

function resolveIsTouristCommune(territory: TerritoryProfile): TerritoryContextFlag {
  const tourism = territory.enrichment?.tourism;
  if (!tourism?.available) {
    return null;
  }

  const places = tourism.accommodationPlaces ?? 0;
  if (places <= 0) {
    return false;
  }

  if (places >= TOURIST_COMMUNE_MIN_ACCOMMODATION_PLACES) {
    return true;
  }

  const ratio = tourismAccommodationRatio(territory);
  if (ratio == null) {
    return null;
  }

  return ratio >= PER_CAPITA_CAUTION_TOURISM_RATIO;
}

function resolveIsMountainOrNaturalRiskCommune(
  territory: TerritoryProfile,
): TerritoryContextFlag {
  const risks = territory.enrichment?.risks;
  if (!risks?.available) {
    return null;
  }

  const radonClass = risks.radon?.potentialClass;
  const radonLabel = risks.radon?.label?.toLowerCase() ?? "";
  const elevatedRadon =
    radonClass === "3" ||
    radonClass === "2" ||
    /élevé|cat[eé]gorie 3|cat[eé]gorie 2/.test(radonLabel);

  const mountainOrAlpineRisk =
    risks.catNatEvents?.some((event) =>
      /s[eé]isme|secousse|avalanche|montagne|neige|alpin/i.test(event.label),
    ) ?? false;

  if (elevatedRadon || mountainOrAlpineRisk) {
    return true;
  }

  if (risks.radon != null || (risks.catNatEvents?.length ?? 0) > 0) {
    return false;
  }

  return null;
}

function resolveHasHighRealEstatePressure(territory: TerritoryProfile): TerritoryContextFlag {
  const property = territory.enrichment?.property;
  if (!property?.available || property.averagePricePerM2 == null) {
    return null;
  }

  const departmentAverage = property.departmentAveragePricePerM2;
  if (departmentAverage == null || departmentAverage <= 0) {
    return null;
  }

  return property.averagePricePerM2 / departmentAverage >= HIGH_REAL_ESTATE_PREMIUM_RATIO;
}

function resolveHasHighEmploymentBase(territory: TerritoryProfile): TerritoryContextFlag {
  const sectors = territory.enrichment?.employmentSectors;
  const population = territory.population;

  if (!sectors?.available || sectors.totalSalariedPosts == null) {
    return null;
  }

  if (population == null || population <= 0) {
    return null;
  }

  return (
    sectors.totalSalariedPosts / population >= HIGH_EMPLOYMENT_BASE_POSTS_PER_RESIDENT
  );
}

function resolveHasHighTourismCapacityPerResident(
  territory: TerritoryProfile,
): TerritoryContextFlag {
  const ratio = tourismAccommodationRatio(territory);
  if (ratio == null) {
    return null;
  }

  return ratio >= HIGH_TOURISM_CAPACITY_PER_RESIDENT_RATIO;
}

function resolveRequiresPerCapitaCaution(
  territory: TerritoryProfile,
  hasHighTourismCapacityPerResident: TerritoryContextFlag,
): TerritoryContextFlag {
  if (hasHighTourismCapacityPerResident === true) {
    return true;
  }

  const tourism = territory.enrichment?.tourism;
  if (!tourism?.available) {
    return hasHighTourismCapacityPerResident;
  }

  const places = tourism.accommodationPlaces ?? 0;
  const ratio = tourismAccommodationRatio(territory);

  if (ratio == null) {
    return null;
  }

  if (
    places >= PER_CAPITA_CAUTION_MIN_ACCOMMODATION_PLACES &&
    ratio >= PER_CAPITA_CAUTION_TOURISM_RATIO
  ) {
    return true;
  }

  if (ratio < PER_CAPITA_CAUTION_TOURISM_RATIO) {
    return false;
  }

  return null;
}

export function buildTerritoryContext(territory: TerritoryProfile): TerritoryContext {
  const population = territory.population;
  const growthPercent = resolvePopulationGrowthPercent(territory);
  const hasHighTourismCapacityPerResident =
    resolveHasHighTourismCapacityPerResident(territory);

  return {
    isSmallPopulation:
      population == null ? null : population < SMALL_COMMUNE_POPULATION_THRESHOLD,
    isDenseUrban: resolveIsDenseUrban(territory),
    isCentralityInEpci: resolveIsCentralityInEpci(territory),
    isTouristCommune: resolveIsTouristCommune(territory),
    isMountainOrNaturalRiskCommune: resolveIsMountainOrNaturalRiskCommune(territory),
    hasStrongPopulationGrowth:
      growthPercent == null
        ? null
        : growthPercent >= STRONG_POPULATION_GROWTH_THRESHOLD_PERCENT,
    hasPopulationDecline: growthPercent == null ? null : growthPercent < 0,
    hasHighRealEstatePressure: resolveHasHighRealEstatePressure(territory),
    hasHighEmploymentBase: resolveHasHighEmploymentBase(territory),
    hasHighTourismCapacityPerResident,
    requiresPerCapitaCaution: resolveRequiresPerCapitaCaution(
      territory,
      hasHighTourismCapacityPerResident,
    ),
  };
}

/** Signaux touristiques convergents (hors ratio/habitant). */
export function countTourismContextSignals(
  territory: TerritoryProfile,
  hasTourismStrength: boolean,
): number {
  let count = 0;
  const context = buildTerritoryContext(territory);
  const centrality = territory.enrichment?.geography?.attractionArea;

  if (context.isTouristCommune === true) {
    count += 1;
  }
  if (hasTourismStrength) {
    count += 1;
  }
  if (
    centrality?.available &&
    aavRoleFromCategoryCode(centrality.categoryCode) === "pole"
  ) {
    count += 1;
  }
  if ((territory.enrichment?.equipments?.totalEquipments ?? 0) >= 100) {
    count += 1;
  }

  return count;
}
