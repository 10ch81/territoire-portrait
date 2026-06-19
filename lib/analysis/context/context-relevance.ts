import type { TerritoryProfile } from "../../types";
import type { AnalysisFact } from "../types";
import type { TerritoryContext } from "./buildTerritoryContext";

export const LARGE_CITY_FIBER_GENERIC_THRESHOLD_PERCENT = 95;
export const LARGE_CITY_MAX_FRANCE_SERVICES_FOR_STRENGTH = 1;

/** France Services ou fibre générique — peu pertinent comme point fort en grande ville. */
export function isMechanicalLargeCityStrength(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  context: TerritoryContext,
): boolean {
  if (context.isLargeCity !== true) {
    return false;
  }

  if (fact.theme === "public_services" && /France Services/i.test(fact.sentence)) {
    const count = territory.enrichment?.proximityServices?.franceServicesCount ?? 0;
    return count <= LARGE_CITY_MAX_FRANCE_SERVICES_FOR_STRENGTH;
  }

  if (fact.theme === "connectivity") {
    const fiber = territory.enrichment?.mobility?.connectivity?.fiberEligibleSharePercent;
    if (fiber != null && fiber >= LARGE_CITY_FIBER_GENERIC_THRESHOLD_PERCENT) {
      const hasSpecificity =
        /référence|département|écart|fracture|retard|sous-couverture/i.test(fact.sentence);
      return !hasSpecificity;
    }
  }

  return false;
}

/** France Services unique — opportunité trop générique en grande ville. */
export function isMechanicalLargeCityOpportunity(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  context: TerritoryContext,
): boolean {
  if (context.isLargeCity !== true) {
    return false;
  }

  if (fact.theme !== "public_services") {
    return false;
  }

  if (!/France Services/i.test(fact.sentence)) {
    return false;
  }

  const count = territory.enrichment?.proximityServices?.franceServicesCount ?? 0;
  return count <= LARGE_CITY_MAX_FRANCE_SERVICES_FOR_STRENGTH;
}

export function contextSelectionScorePenalty(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  context: TerritoryContext,
): number {
  if (isMechanicalLargeCityStrength(fact, territory, context)) {
    return -45;
  }
  return 0;
}

export function isContextuallySelectableForTarget(
  fact: AnalysisFact,
  target: AnalysisFact["target"],
  territory: TerritoryProfile,
  context: TerritoryContext,
): boolean {
  if (target === "strengths" && isMechanicalLargeCityStrength(fact, territory, context)) {
    return false;
  }

  if (target === "opportunities" && isMechanicalLargeCityOpportunity(fact, territory, context)) {
    return false;
  }

  return true;
}
