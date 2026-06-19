import type { TerritoryProfile } from "../types";
import type { TerritoryContext } from "./context/buildTerritoryContext";
import {
  computeOpportunityQuality,
  ESS_MIN_SIGNIFICANT_COUNT,
  hasGenericOpportunityPhrasing,
  hasOpportunityTraceability,
  isStudyOnlyOpportunity,
  RGE_MIN_SIGNIFICANT_COUNT,
} from "./opportunity-quality";
import {
  assessSecurityIndicators,
  countSecurityIndicatorsAboveReference,
  hasSecurityIndicatorsAboveReference,
} from "./security-indicators";
import {
  DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR,
  qualifiesAsProfileAwareDebtWatchPoint,
  resolveComparisonProfile,
} from "../typology/thresholds";
import type {
  AnalysisFact,
  AnalysisFactTarget,
  AnalysisFactTheme,
  FactDenominatorRisk,
  FactEvidenceLevel,
  FactIntensity,
  FactPolarity,
  FactProgressiveQualification,
  FactSignificanceLevel,
  QualifiedAnalysisFact,
} from "./types";

/** Score de généricité au-delà duquel une opportunité est rejetée. */
export const OPPORTUNITY_MAX_GENERICITY_SCORE = 60;

function debtIsElevated(debtPerCapitaEur: number, territory: TerritoryProfile): boolean {
  return qualifiesAsProfileAwareDebtWatchPoint(
    debtPerCapitaEur,
    resolveComparisonProfile(territory),
    territory.population,
  ) || debtPerCapitaEur >= DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR;
}

const PROGRESSIVE_THEMES: AnalysisFactTheme[] = [
  "security",
  "ageing",
  "finances",
  "tourism",
  "ess_rge",
  "housing",
  "risks",
  "mobility",
  "connectivity",
  "employment",
  "policy_city",
  "public_services",
  "education",
];

function sentenceUsesResidentDenominator(sentence: string): boolean {
  return /par habitant|pour\s+(?:1[\s\u00a0]000|100)\s+habitants?|\/\s*hab|pour 100 habitants/i.test(
    sentence,
  );
}

function defaultProgressiveQualification(
  fact: AnalysisFact,
  territoryContext: TerritoryContext,
): FactProgressiveQualification {
  const denominatorRisk = resolveDenominatorRisk(fact, territoryContext);
  const hasEvidence =
    fact.evidence.length > 0 || (fact.numericBindings?.length ?? 0) > 0;

  return {
    evidenceLevel: hasEvidence ? "contextual" : "weak_signal",
    significanceLevel: fact.confidence === "high" ? "medium" : "low",
    benchmarkStatus: "not_required",
    genericityScore: 0,
    actionabilityScore: fact.target === "opportunities" ? 50 : 30,
    denominatorRisk,
    requiresCaution: denominatorRisk !== "none",
  };
}

function resolveDenominatorRisk(
  fact: AnalysisFact,
  territoryContext: TerritoryContext,
): FactDenominatorRisk {
  const perCapitaSentence = sentenceUsesResidentDenominator(fact.sentence);

  if (territoryContext.requiresPerCapitaCaution === true && perCapitaSentence) {
    if (
      fact.theme === "tourism" ||
      fact.theme === "employment_sectors" ||
      fact.theme === "equipments" ||
      fact.theme === "finances" ||
      fact.theme === "connectivity" ||
      fact.theme === "employment"
    ) {
      return "tourist_population";
    }
  }

  if (territoryContext.isSmallPopulation === true && perCapitaSentence) {
    if (
      fact.theme === "finances" ||
      fact.theme === "employment" ||
      fact.theme === "income" ||
      fact.theme === "equipments" ||
      fact.theme === "employment_sectors"
    ) {
      return "small_population";
    }
  }

  return "none";
}

function qualifySecurityProgressive(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): FactProgressiveQualification {
  const security = territory.enrichment?.security;
  if (!security?.available || !hasSecurityIndicatorsAboveReference(security)) {
    return {
      evidenceLevel: "weak_signal",
      significanceLevel: "low",
      benchmarkStatus: security?.available ? "available" : "missing",
      genericityScore: 0,
      actionabilityScore: 20,
      denominatorRisk: "none",
      requiresCaution: true,
    };
  }

  const assessments = assessSecurityIndicators(security.indicators);
  const aboveCount = countSecurityIndicatorsAboveReference(assessments);
  const comparableCount = assessments.length;

  let evidenceLevel: FactEvidenceLevel = "single_indicator";
  if (aboveCount > comparableCount / 2) {
    evidenceLevel = "direct_strong";
  } else if (aboveCount >= 2) {
    evidenceLevel = "direct_moderate";
  }

  let significanceLevel: FactSignificanceLevel = "medium";
  if (aboveCount >= 3) {
    significanceLevel = "high";
  } else if (aboveCount === 1) {
    significanceLevel = "medium";
  }

  return {
    evidenceLevel,
    significanceLevel,
    benchmarkStatus: "available",
    genericityScore: 0,
    actionabilityScore: 25,
    denominatorRisk: "none",
    requiresCaution: true,
  };
}

function qualifyAgeingProgressive(fact: AnalysisFact): FactProgressiveQualification {
  const match = fact.sentence.match(/([\d,]+)\s*%/);
  const share = match ? Number.parseFloat(match[1].replace(",", ".")) : null;
  const hasNumericBinding = (fact.numericBindings?.length ?? 0) > 0;

  let significanceLevel: FactSignificanceLevel = "low";
  if (share != null && share >= 40) {
    significanceLevel = "high";
  } else if (share != null && share >= 30) {
    significanceLevel = "medium";
  }

  return {
    evidenceLevel: hasNumericBinding ? "direct_moderate" : "contextual",
    significanceLevel,
    benchmarkStatus: "missing",
    genericityScore: 5,
    actionabilityScore: 20,
    denominatorRisk: "none",
    requiresCaution: false,
  };
}

function qualifyFinancesProgressive(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  territoryContext: TerritoryContext,
): FactProgressiveQualification {
  const accounts = territory.enrichment?.publicAccounts;
  const isDebtFact = /dette|encours/i.test(fact.sentence);

  if (!isDebtFact) {
    return {
      evidenceLevel: (fact.numericBindings?.length ?? 0) > 0 ? "direct_moderate" : "contextual",
      significanceLevel: "low",
      benchmarkStatus: "not_required",
      genericityScore: 0,
      actionabilityScore: 30,
      denominatorRisk: resolveDenominatorRisk(fact, territoryContext),
      requiresCaution: false,
    };
  }

  const hasRevenue =
    accounts?.operatingRevenuePerCapitaEur != null ||
    accounts?.operatingRevenueEur != null;
  const debt = accounts?.debtPerCapitaEur ?? null;
  const debtIsWatchPoint =
    debt != null && debtIsElevated(debt, territory);

  return {
    evidenceLevel: hasRevenue ? "direct_moderate" : "single_indicator",
    significanceLevel: debtIsWatchPoint ? "high" : "medium",
    benchmarkStatus: hasRevenue ? "available" : "missing",
    genericityScore: hasRevenue ? 5 : 15,
    actionabilityScore: 35,
    denominatorRisk: resolveDenominatorRisk(fact, territoryContext),
    requiresCaution: !hasRevenue && sentenceUsesResidentDenominator(fact.sentence),
  };
}

export function resolveOpportunityGenericityScore(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  relatedWatchPointThemes: AnalysisFactTheme[] = [],
): number {
  let score = 0;

  if (isStudyOnlyOpportunity(fact.sentence)) {
    score += 45;
  }
  if (hasGenericOpportunityPhrasing(fact.sentence)) {
    score += 35;
  }
  if (!hasOpportunityTraceability(fact)) {
    score += 40;
  }

  const quality = computeOpportunityQuality(fact, {
    territory,
    relatedWatchPointThemes,
  });
  if (quality.isGeneric) {
    score += 25;
  }
  if (quality.lacksConcreteLever) {
    score += 15;
  }
  if (quality.weakEvidence) {
    score += 20;
  }

  if (fact.theme === "ess_rge" && !quality.isGeneric) {
    const enterprises = territory.enrichment?.enterprises;
    const essCount = enterprises?.essCount ?? 0;
    const rgeCount = enterprises?.rgeCount ?? 0;
    if (essCount >= ESS_MIN_SIGNIFICANT_COUNT) {
      score -= 15;
    }
    if (rgeCount >= RGE_MIN_SIGNIFICANT_COUNT) {
      score -= 10;
    }
  }

  return Math.min(100, Math.max(0, score));
}

function computeOpportunityGenericityScore(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): number {
  return resolveOpportunityGenericityScore(fact, territory);
}

function qualifyOpportunityProgressive(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  territoryContext: TerritoryContext,
): FactProgressiveQualification {
  const genericityScore = computeOpportunityGenericityScore(fact, territory);
  const quality = computeOpportunityQuality(fact, { territory });
  const denominatorRisk = resolveDenominatorRisk(fact, territoryContext);

  let evidenceLevel: FactEvidenceLevel = "contextual";
  if (fact.evidence.length >= 2 && hasOpportunityTraceability(fact)) {
    evidenceLevel = "direct_moderate";
  } else if (!hasOpportunityTraceability(fact)) {
    evidenceLevel = "weak_signal";
  }

  return {
    evidenceLevel,
    significanceLevel: quality.acceptable ? "medium" : "low",
    benchmarkStatus: "not_required",
    genericityScore,
    actionabilityScore: Math.max(0, 100 - genericityScore),
    denominatorRisk,
    requiresCaution: denominatorRisk !== "none",
  };
}

export function qualifyProgressiveDimensions(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  territoryContext: TerritoryContext,
): FactProgressiveQualification {
  switch (fact.theme) {
    case "security":
      return qualifySecurityProgressive(fact, territory);
    case "ageing":
      return qualifyAgeingProgressive(fact);
    case "finances":
      return qualifyFinancesProgressive(fact, territory, territoryContext);
    default:
      if (fact.target === "opportunities") {
        return qualifyOpportunityProgressive(fact, territory, territoryContext);
      }
      return defaultProgressiveQualification(fact, territoryContext);
  }
}

export function applyProgressiveQualification(
  qualified: AnalysisFact & {
    polarity: FactPolarity;
    intensity: FactIntensity;
    eligibleTargets: AnalysisFactTarget[];
    qualificationReason?: string;
  },
  territory: TerritoryProfile,
  territoryContext: TerritoryContext,
): QualifiedAnalysisFact {
  const progressive = qualifyProgressiveDimensions(qualified, territory, territoryContext);

  return {
    ...qualified,
    ...progressive,
  };
}

export function isProgressiveWatchPointEligible(
  qualified: QualifiedAnalysisFact,
): boolean {
  if (qualified.evidenceLevel === "weak_signal") {
    return false;
  }

  if (
    qualified.theme === "ageing" &&
    qualified.benchmarkStatus === "missing"
  ) {
    return false;
  }

  return true;
}

export function isProgressiveOpportunityEligible(
  qualified: QualifiedAnalysisFact,
  liveGenericityScore?: number,
): boolean {
  if (qualified.evidenceLevel === "weak_signal") {
    return false;
  }

  const genericity = liveGenericityScore ?? qualified.genericityScore;
  return genericity < OPPORTUNITY_MAX_GENERICITY_SCORE;
}

export function applyProgressiveCaution(
  fact: AnalysisFact,
  _qualified: QualifiedAnalysisFact | undefined,
): AnalysisFact {
  return fact;
}

/** Phrase affichée dans les listes verbatim — sans suffixe mécanique de prudence. */
export function renderFactSentenceForOutput(fact: AnalysisFact): string {
  return fact.sentence;
}

export function indexQualifiedFacts(
  qualifiedFacts: QualifiedAnalysisFact[],
): Map<string, QualifiedAnalysisFact> {
  return new Map(qualifiedFacts.map((fact) => [fact.id, fact]));
}

export { PROGRESSIVE_THEMES };
