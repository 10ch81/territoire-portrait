import type { TerritoryProfile } from "../../types";
import {
  HIGH_TOURISM_CAPACITY_PER_RESIDENT_RATIO,
  HOSPITALITY_EMPLOYMENT_SHARE_THRESHOLD,
  LARGE_CITY_POPULATION_THRESHOLD,
  tourismAccommodationRatio,
} from "./buildTerritoryContext";

/** Ratio places / population résidente considéré comme signal touristique fort. */
export const STRONG_TOURISM_CAPACITY_PER_RESIDENT = 0.2;

/** Ratio minimal places/population pour associer montagne et tourisme. */
export const MOUNTAIN_TOURISM_MIN_CAPACITY_RATIO = 0.15;

/** Signaux touristiques forts requis (au moins 2, sauf grande ville). */
export function countTourismStrongSignals(territory: TerritoryProfile): number {
  let count = 0;
  const ratio = tourismAccommodationRatio(territory);

  if (ratio != null && ratio >= STRONG_TOURISM_CAPACITY_PER_RESIDENT) {
    count += 1;
  }

  const sectors = territory.enrichment?.employmentSectors;
  if (sectors?.available && sectors.totalSalariedPosts && sectors.totalSalariedPosts > 0) {
    const hospitality = sectors.sectors.find(
      (sector) =>
        sector.code === "IZ" || /h[eé]bergement|restauration/i.test(sector.label),
    );
    if (hospitality?.salariedPosts) {
      const share = hospitality.salariedPosts / sectors.totalSalariedPosts;
      if (share >= HOSPITALITY_EMPLOYMENT_SHARE_THRESHOLD) {
        count += 1;
      }
    }
  }

  const risks = territory.enrichment?.risks;
  if (risks?.available) {
    const mountainOrAlpineRisk =
      risks.catNatEvents?.some((event) =>
        /s[eé]isme|secousse|avalanche|montagne|neige|alpin/i.test(event.label),
      ) ?? false;
    if (mountainOrAlpineRisk && ratio != null && ratio >= MOUNTAIN_TOURISM_MIN_CAPACITY_RATIO) {
      count += 1;
    }
  }

  const property = territory.enrichment?.property;
  if (
    property?.available &&
    property.averagePricePerM2 != null &&
    property.departmentAveragePricePerM2 != null &&
    property.departmentAveragePricePerM2 > 0 &&
    property.averagePricePerM2 / property.departmentAveragePricePerM2 >= 1.15 &&
    ratio != null &&
    ratio >= STRONG_TOURISM_CAPACITY_PER_RESIDENT
  ) {
    count += 1;
  }

  const population = territory.population;
  if (
    population != null &&
    population < LARGE_CITY_POPULATION_THRESHOLD &&
    ratio != null &&
    ratio >= STRONG_TOURISM_CAPACITY_PER_RESIDENT
  ) {
    count += 1;
  }

  return count;
}

export function resolveStrictTouristCommune(territory: TerritoryProfile): boolean | null {
  if (territory.enrichment == null) {
    return null;
  }

  const tourism = territory.enrichment.tourism;
  const ratio = tourismAccommodationRatio(territory);
  const population = territory.population;

  if (!tourism?.available && ratio == null) {
    const strongSignals = countTourismStrongSignals(territory);
    return strongSignals >= 2 ? true : strongSignals === 0 ? false : null;
  }

  const strongSignals = countTourismStrongSignals(territory);

  if (population != null && population >= LARGE_CITY_POPULATION_THRESHOLD) {
    if (
      ratio != null &&
      ratio >= HIGH_TOURISM_CAPACITY_PER_RESIDENT_RATIO &&
      strongSignals >= 2
    ) {
      return true;
    }
    return strongSignals >= 3;
  }

  return strongSignals >= 2;
}
