import type { TerritoryProfile } from "../../types";
import type { AnalysisFact, AnalysisFactTheme } from "../types";
import type { TerritoryContext } from "./buildTerritoryContext";

export const GENERIC_FIBER_THRESHOLD_PERCENT = 95;
export const MAX_FRANCE_SERVICES_FOR_MECHANICAL = 1;

function franceServicesCount(territory: TerritoryProfile): number {
  return territory.enrichment?.proximityServices?.franceServicesCount ?? 0;
}

function fiberSharePercent(territory: TerritoryProfile): number | null {
  return territory.enrichment?.mobility?.connectivity?.fiberEligibleSharePercent ?? null;
}

function isContextuallyDenseOrCentral(context: TerritoryContext): boolean {
  return context.isLargeCity === true || context.isDenseUrban === true;
}

function isGenericFiberSentence(sentence: string): boolean {
  return !/référence|département|écart|fracture|retard|sous-couverture/i.test(sentence);
}

function isGenericFiberCoverage(
  territory: TerritoryProfile,
  context: TerritoryContext,
): boolean {
  const fiber = fiberSharePercent(territory);
  if (fiber == null || fiber < GENERIC_FIBER_THRESHOLD_PERCENT) {
    return false;
  }

  return (
    isContextuallyDenseOrCentral(context) ||
    context.isTouristCommune === true
  );
}

function isMechanicalFranceServicesContext(
  territory: TerritoryProfile,
  context: TerritoryContext,
): boolean {
  if (franceServicesCount(territory) > MAX_FRANCE_SERVICES_FOR_MECHANICAL) {
    return false;
  }

  return (
    isContextuallyDenseOrCentral(context) ||
    context.isTouristCommune === true
  );
}

/** France Services ou fibre générique — peu pertinent comme point fort. */
export function isMechanicalContextStrength(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  context: TerritoryContext,
): boolean {
  if (fact.theme === "public_services" && /France Services/i.test(fact.sentence)) {
    return isMechanicalFranceServicesContext(territory, context);
  }

  if (fact.theme === "connectivity") {
    return isGenericFiberCoverage(territory, context) && isGenericFiberSentence(fact.sentence);
  }

  return false;
}

/** @deprecated Préférer isMechanicalContextStrength */
export const isMechanicalLargeCityStrength = isMechanicalContextStrength;

function isGenericFiberOpportunity(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  context: TerritoryContext,
): boolean {
  if (fact.theme !== "connectivity") {
    return false;
  }

  if (!/fibre|numérique|couverture|raccordables/i.test(fact.sentence)) {
    return false;
  }

  return isGenericFiberCoverage(territory, context);
}

function isGenericFranceServicesOpportunity(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  context: TerritoryContext,
): boolean {
  if (fact.theme !== "public_services" || !/France Services/i.test(fact.sentence)) {
    return false;
  }

  return isMechanicalFranceServicesContext(territory, context);
}

function isGenericRisksOpportunity(
  fact: AnalysisFact,
  relatedWatchPointThemes: AnalysisFactTheme[],
): boolean {
  if (fact.theme !== "risks") {
    return false;
  }

  if (/Renforcer la prévention et l'adaptation aux risques naturels/i.test(fact.sentence)) {
    return !relatedWatchPointThemes.includes("risks");
  }

  return false;
}

/** Opportunité trop générique pour le contexte territorial. */
export function isMechanicalContextOpportunity(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  context: TerritoryContext,
  relatedWatchPointThemes: AnalysisFactTheme[] = [],
): boolean {
  return (
    isGenericFranceServicesOpportunity(fact, territory, context) ||
    isGenericFiberOpportunity(fact, territory, context) ||
    isGenericRisksOpportunity(fact, relatedWatchPointThemes)
  );
}

/** @deprecated Préférer isMechanicalContextOpportunity */
export function isMechanicalLargeCityOpportunity(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  context: TerritoryContext,
): boolean {
  return isMechanicalContextOpportunity(fact, territory, context);
}

export function contextSelectionScorePenalty(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  context: TerritoryContext,
): number {
  if (isMechanicalContextStrength(fact, territory, context)) {
    return -45;
  }
  return 0;
}

export function isContextuallySelectableForTarget(
  fact: AnalysisFact,
  target: AnalysisFact["target"],
  territory: TerritoryProfile,
  context: TerritoryContext,
  relatedWatchPointThemes: AnalysisFactTheme[] = [],
): boolean {
  if (target === "strengths" && isMechanicalContextStrength(fact, territory, context)) {
    return false;
  }

  if (
    target === "opportunities" &&
    isMechanicalContextOpportunity(fact, territory, context, relatedWatchPointThemes)
  ) {
    return false;
  }

  return true;
}
