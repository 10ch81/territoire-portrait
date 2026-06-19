import type { TerritoryProfile } from "../types";
import type { AnalysisFact, AnalysisFactTheme } from "./types";
import {
  qualifiesAsDebtWatchPoint,
  qualifiesAsIncomeWatchPoint,
  qualifiesAsUnemploymentWatchPoint,
  qualifiesAsVacancyWatchPoint,
  isDescriptiveIncomeWatchPointSentence,
} from "./qualify-facts";

const CONFIDENCE_SCORE = { high: 30, medium: 15, low: 0 } as const;

const THEME_PRIORITY: Partial<Record<AnalysisFactTheme, number>> = {
  identity: 20,
  centrality: 18,
  demography: 18,
  ageing: 14,
  equipments: 16,
  education: 14,
  health: 14,
  public_services: 12,
  economy: 15,
  employment_sectors: 15,
  ess_rge: 8,
  housing: 14,
  social_housing: 12,
  employment: 13,
  income: 12,
  security: 10,
  risks: 10,
  mobility: 10,
  connectivity: 10,
  energy: 6,
  tourism: 6,
  real_estate: 8,
  finances: 6,
  policy_city: 10,
};

const STUDY_ONLY_PATTERN =
  /(?:faire|mener|conduire)\s+(?:une\s+)?(?:analyse|étude)|analyse plus poussée|potentiel touristique à approfondir,\s*faute de|faute de données de fréquentation\.$/i;

export interface ScoreContext {
  territory: TerritoryProfile;
}

function intensityBonus(fact: AnalysisFact, territory: TerritoryProfile): number {
  const housing = territory.enrichment?.housing;
  const sociodemographics = territory.enrichment?.sociodemographics;
  const connectivity = territory.enrichment?.mobility?.connectivity;

  if (fact.theme === "housing" && housing?.rpVacancyRatePercent != null) {
    if (qualifiesAsVacancyWatchPoint(housing.rpVacancyRatePercent)) {
      return 12;
    }
    return -20;
  }

  if (fact.theme === "employment" && sociodemographics?.unemploymentRate != null) {
    if (qualifiesAsUnemploymentWatchPoint(sociodemographics.unemploymentRate)) {
      return 12;
    }
  }

  if (fact.theme === "finances" && /dette/i.test(fact.sentence)) {
    if (qualifiesAsDebtWatchPoint(territory.enrichment?.publicAccounts?.debtPerCapitaEur)) {
      return 8;
    }
    return -20;
  }

  if (fact.theme === "income") {
    if (!qualifiesAsIncomeWatchPoint(territory)) {
      return -20;
    }
    if (isDescriptiveIncomeWatchPointSentence(fact.sentence)) {
      return -20;
    }
    return 10;
  }

  if (fact.theme === "security") {
    const security = territory.enrichment?.security;
    const unfavorable = security?.indicators.some(
      (indicator) =>
        indicator.diffused &&
        indicator.departmentRatePer1000 !== null &&
        indicator.ratePer1000 !== null &&
        indicator.ratePer1000 > indicator.departmentRatePer1000,
    );
    if (unfavorable) return 10;
    return -20;
  }

  if (fact.theme === "social_housing" && /Aucun logement locatif social/i.test(fact.sentence)) {
    return -20;
  }

  if (fact.theme === "mobility" && /marginale/i.test(fact.sentence)) {
    return -20;
  }

  if (fact.theme === "connectivity" && connectivity?.fiberEligibleSharePercent != null) {
    if (connectivity.fiberEligibleSharePercent >= 80) return 10;
  }

  if (fact.theme === "ageing" && fact.sentence.includes("60 ans")) {
    return 8;
  }

  return 0;
}

function hasPrevalidatedComparison(fact: AnalysisFact): boolean {
  return (
    fact.theme === "security" &&
    fact.sentence.includes("références départementales")
  );
}

export function scoreAnalysisFact(
  fact: AnalysisFact,
  context: ScoreContext,
): number {
  let score = CONFIDENCE_SCORE[fact.confidence];
  score += THEME_PRIORITY[fact.theme] ?? 5;

  if (fact.year !== undefined && fact.year !== null) {
    score += 10;
  }

  if ((fact.numericBindings?.length ?? 0) > 0) {
    score += 15;
  }

  if (hasPrevalidatedComparison(fact)) {
    score += 10;
  }

  score += intensityBonus(fact, context.territory);

  if (STUDY_ONLY_PATTERN.test(fact.sentence)) {
    score -= 25;
  }

  if (fact.target === "opportunities" && fact.confidence === "low") {
    score -= 10;
  }

  if ((fact.limitations?.length ?? 0) >= 2) {
    score += 5;
  }

  return Math.max(0, score);
}

export function isStudyOnlyFact(fact: AnalysisFact): boolean {
  return STUDY_ONLY_PATTERN.test(fact.sentence);
}

export function isActionableOpportunity(fact: AnalysisFact): boolean {
  if (fact.target !== "opportunities") return false;
  if (isStudyOnlyFact(fact)) return false;
  return true;
}
