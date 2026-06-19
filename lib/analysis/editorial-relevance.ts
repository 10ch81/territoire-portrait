import type { TerritoryProfile } from "../types";
import type { TerritoryContext } from "./context/buildTerritoryContext";
import type { AnalysisFact, AnalysisFactTarget, AnalysisFactTheme } from "./types";

const TOURISM_ACCOMMODATION_PATTERN = /places d'hébergement touristique/i;
const ESS_RGE_ADMIN_INVENTORY_PATTERN = /répertoire administratif identifie/i;

/** Capacité touristique : point fort seulement si le territoire est touristique au sens strict. */
export function isTourismAccommodationStrength(
  fact: AnalysisFact,
  context: TerritoryContext,
): boolean {
  if (fact.theme !== "tourism" || !TOURISM_ACCOMMODATION_PATTERN.test(fact.sentence)) {
    return true;
  }
  return context.isTouristCommune === true;
}

/** Inventaire ESS/RGE administratif : jamais un point fort éditorial par défaut. */
export function isEssRgeAdministrativeInventory(fact: AnalysisFact): boolean {
  return fact.theme === "ess_rge" && ESS_RGE_ADMIN_INVENTORY_PATTERN.test(fact.sentence);
}

/**
 * Filtre minimal de pertinence éditoriale pour les points forts.
 * Ne retire pas les faits des builders ni des fiches détaillées — sélection IA uniquement.
 */
export function isEditoriallyStrongFact(
  fact: AnalysisFact,
  _territory: TerritoryProfile,
  context: TerritoryContext,
  _relatedWatchPointThemes: AnalysisFactTheme[] = [],
): boolean {
  if (!isTourismAccommodationStrength(fact, context)) {
    return false;
  }

  if (isEssRgeAdministrativeInventory(fact)) {
    return false;
  }

  return true;
}

const GENERIC_ESS_RGE_MOBILIZATION_PATTERN =
  /mobiliser les acteurs ess et rge/i;

function isGenericEssRgeMobilizationOpportunity(
  fact: AnalysisFact,
  context: TerritoryContext,
): boolean {
  return (
    fact.theme === "ess_rge" &&
    GENERIC_ESS_RGE_MOBILIZATION_PATTERN.test(fact.sentence) &&
    (context.isLargeCity === true || context.isDenseUrban === true)
  );
}

export function isEditoriallyRelevantForTarget(
  fact: AnalysisFact,
  target: AnalysisFactTarget,
  territory: TerritoryProfile,
  context: TerritoryContext,
  relatedWatchPointThemes: AnalysisFactTheme[] = [],
): boolean {
  if (target === "strengths") {
    return isEditoriallyStrongFact(
      fact,
      territory,
      context,
      relatedWatchPointThemes,
    );
  }

  if (target === "opportunities" && isGenericEssRgeMobilizationOpportunity(fact, context)) {
    return false;
  }

  return true;
}

/** Pénalité de score pour déclasser les faits peu différenciants en sélection. */
export function editorialScorePenalty(
  fact: AnalysisFact,
  context: TerritoryContext,
): number {
  let penalty = 0;

  if (fact.theme === "tourism" && !isTourismAccommodationStrength(fact, context)) {
    penalty -= 40;
  }

  if (isEssRgeAdministrativeInventory(fact)) {
    penalty -= 40;
  }

  return penalty;
}
