import {
  computeYoungAdultShare,
  YOUNG_ADULT_STRENGTH_THRESHOLD_PERCENT,
} from "../age-aggregates";
import type { TerritoryProfile } from "../types";
import {
  HIGH_EMPLOYMENT_BASE_POSTS_PER_RESIDENT,
  DENSE_URBAN_DENSITY_THRESHOLD_PER_KM2,
} from "./context/buildTerritoryContext";
import {
  isLowEquipmentDensityForProfile,
  resolveComparisonProfile,
} from "../typology/thresholds";
import type { AnalysisFact, AnalysisFactTheme } from "./types";

export const MIN_ABSOLUTE_SALARIED_POSTS = 2_000;
export const MIN_ABSOLUTE_EQUIPMENTS = 500;
export const MIN_POPULATION_FOR_ABSOLUTE_EQUIPMENTS = 50_000;
export const MIN_POPULATION_FOR_EQUIPMENT_DENSITY_ASSERTIVE = 2_000;

const STRONG_STRENGTH_THEMES: AnalysisFactTheme[] = [
  "employment_sectors",
  "equipments",
  "health",
  "education",
  "demography",
];

function populationCount(territory: TerritoryProfile): number | null {
  return territory.population ?? null;
}

export function qualifiesAsStrongEmploymentStrength(territory: TerritoryProfile): boolean {
  const flores = territory.enrichment?.employmentSectors;
  const population = populationCount(territory);
  if (!flores?.available || population === null || population <= 0) {
    return false;
  }

  const ratio = flores.totalSalariedPosts / population;
  return (
    ratio >= HIGH_EMPLOYMENT_BASE_POSTS_PER_RESIDENT ||
    flores.totalSalariedPosts >= MIN_ABSOLUTE_SALARIED_POSTS
  );
}

export function qualifiesAsStrongEquipmentStrength(territory: TerritoryProfile): boolean {
  const equipments = territory.enrichment?.equipments;
  const population = populationCount(territory);
  if (!equipments?.available) {
    return false;
  }

  if (
    population !== null &&
    population >= MIN_POPULATION_FOR_ABSOLUTE_EQUIPMENTS &&
    equipments.totalEquipments >= MIN_ABSOLUTE_EQUIPMENTS
  ) {
    return true;
  }

  if (
    population === null ||
    population < MIN_POPULATION_FOR_EQUIPMENT_DENSITY_ASSERTIVE
  ) {
    return false;
  }

  const per1000 = territory.enrichment?.derived?.equipmentsPer1000Residents ?? null;
  if (per1000 === null) {
    return equipments.totalEquipments > 0;
  }

  return !isLowEquipmentDensityForProfile(per1000, resolveComparisonProfile(territory));
}

export function qualifiesAsStrongHealthStrength(territory: TerritoryProfile): boolean {
  const health = territory.enrichment?.health;
  const population = populationCount(territory);
  if (!health?.available || health.totalEstablishments <= 0 || population === null) {
    return false;
  }

  const threshold = Math.max(5, Math.round(population / 5_000));
  return health.totalEstablishments >= threshold;
}

export function qualifiesAsStrongEducationStrength(territory: TerritoryProfile): boolean {
  const education = territory.enrichment?.education;
  const population = populationCount(territory);
  if (!education?.available || education.totalOpen <= 0 || population === null) {
    return false;
  }

  const threshold = Math.max(3, Math.round(population / 8_000));
  return education.totalOpen >= threshold;
}

export function qualifiesAsStrongYouthStrength(territory: TerritoryProfile): boolean {
  const bands = territory.enrichment?.sociodemographics?.ageBands ?? [];
  const share = computeYoungAdultShare(bands);
  return share !== null && share > YOUNG_ADULT_STRENGTH_THRESHOLD_PERCENT;
}

export function qualifiesAsStrongStrength(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  if (fact.target !== "strengths") {
    return true;
  }

  switch (fact.theme) {
    case "employment_sectors":
      return qualifiesAsStrongEmploymentStrength(territory);
    case "equipments":
      return qualifiesAsStrongEquipmentStrength(territory);
    case "health":
      return qualifiesAsStrongHealthStrength(territory);
    case "education":
      return qualifiesAsStrongEducationStrength(territory);
    case "demography":
      return /moins de 30 ans/i.test(fact.sentence) && qualifiesAsStrongYouthStrength(territory);
    default:
      return !STRONG_STRENGTH_THEMES.includes(fact.theme);
  }
}

export function qualifiesForAttractiveUrbanOpening(territory: TerritoryProfile): boolean {
  const density = territory.densityPerKm2;
  if (density === null || density < DENSE_URBAN_DENSITY_THRESHOLD_PER_KM2) {
    return false;
  }
  return qualifiesAsStrongEquipmentStrength(territory);
}
