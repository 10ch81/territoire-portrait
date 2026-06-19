import type { TerritoryProfile } from "../../types";
import { resolveComparisonProfile } from "../../typology/thresholds";
import type { ComparisonProfile } from "../../typology/types";
import type { TerritoryContext } from "../context/buildTerritoryContext";
import type { QualifiedAnalysisFact } from "../types";
import type { EditorialProfileId } from "./editorialProfiles";
import { getEditorialProfile } from "./editorialProfiles";

function isTrue(flag: boolean | null | undefined): flag is true {
  return flag === true;
}

function hasQpvWatchPoint(qualifiedFacts: QualifiedAnalysisFact[]): boolean {
  return qualifiedFacts.some(
    (fact) =>
      fact.target === "watchPoints" &&
      (fact.theme === "policy_city" || /quartiers? prioritaires?|QPV/i.test(fact.sentence)),
  );
}

function fallbackFromComparisonProfile(profile: ComparisonProfile): EditorialProfileId {
  switch (profile) {
    case "metropole":
    case "grande_ville":
    case "ville_moyenne":
      return "largeUrbanCenter";
    case "petite_centralite":
      return "genericCentralite";
    case "rural":
    case "rural_isole":
      return "ruralDecline";
    case "periurbain":
      return "smallPeriurbanGrowth";
    case "unknown":
      return "genericCentralite";
    default: {
      const _exhaustive: never = profile;
      return _exhaustive;
    }
  }
}

export function classifyEditorialProfile(
  territory: TerritoryProfile,
  context: TerritoryContext,
  qualifiedFacts: QualifiedAnalysisFact[] = [],
): EditorialProfileId {
  const comparisonProfile = resolveComparisonProfile(territory);

  if (isTrue(context.isTouristCommune) && isTrue(context.isMountainOrNaturalRiskProfile)) {
    return "mountainTourismCenter";
  }

  if (
    isTrue(context.isSmallPopulation) &&
    isTrue(context.isCentralityInEpci) &&
    isTrue(context.hasStrongPopulationGrowth)
  ) {
    return "smallPeriurbanGrowth";
  }

  if (
    isTrue(context.isSmallPopulation) &&
    isTrue(context.securitySmallNumbersRisk) &&
    (isTrue(context.isCentralityInEpci) || isTrue(context.hasStrongPopulationGrowth))
  ) {
    return "smallPeriurbanGrowth";
  }

  if (
    isTrue(context.isCentralityInEpci) &&
    isTrue(context.hasStrongPopulationGrowth) &&
    context.isLargeCity === false
  ) {
    return "growthEpciCentrality";
  }

  if (isTrue(context.isLargeCity) || comparisonProfile === "metropole") {
    return "largeUrbanCenter";
  }

  if (isTrue(context.hasHighEmploymentBase) && context.isLargeCity === false) {
    return "employmentPole";
  }

  if (isTrue(context.hasPopulationDecline) && isTrue(context.isSmallPopulation)) {
    return "ruralDecline";
  }

  if (isTrue(context.isDenseUrban) && hasQpvWatchPoint(qualifiedFacts)) {
    return "socialFragilityUrban";
  }

  return fallbackFromComparisonProfile(comparisonProfile);
}

export function resolveClassifiedEditorialProfile(
  territory: TerritoryProfile,
  context: TerritoryContext,
  qualifiedFacts: QualifiedAnalysisFact[] = [],
) {
  const id = classifyEditorialProfile(territory, context, qualifiedFacts);
  return getEditorialProfile(id);
}
