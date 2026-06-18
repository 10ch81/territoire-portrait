import type { TerritoryProfile } from "../types";
import type { AnalysisFact, AnalysisFactTheme } from "./types";

const CONFIDENCE_SCORE = { high: 30, medium: 15, low: 0 } as const;

const THEME_PRIORITY: Partial<Record<AnalysisFactTheme, number>> = {
  identity: 20,
  centrality: 18,
  demography: 20,
  ageing: 17,
  equipments: 16,
  education: 14,
  health: 14,
  public_services: 12,
  economy: 15,
  employment_sectors: 15,
  ess_rge: 8,
  housing: 17,
  social_housing: 14,
  employment: 16,
  income: 15,
  security: 14,
  risks: 14,
  mobility: 14,
  connectivity: 8,
  energy: 6,
  tourism: 5,
  real_estate: 8,
  finances: 7,
  policy_city: 14,
};

/** Thèmes généralement prioritaires pour les points d'attention (sans obligation). */
export const WATCH_POINT_PRIORITY_THEMES: AnalysisFactTheme[] = [
  "demography",
  "ageing",
  "employment",
  "income",
  "housing",
  "social_housing",
  "risks",
  "security",
  "mobility",
  "policy_city",
  "finances",
];

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
    if (housing.rpVacancyRatePercent >= 10) return 12;
  }

  if (fact.theme === "employment" && sociodemographics?.unemploymentRate != null) {
    if (sociodemographics.unemploymentRate >= 10) return 12;
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

export function isWatchPointPriorityTheme(theme: AnalysisFactTheme): boolean {
  return WATCH_POINT_PRIORITY_THEMES.includes(theme);
}

export function hasRobustIndicator(fact: AnalysisFact): boolean {
  return (fact.numericBindings?.length ?? 0) > 0 || fact.confidence === "high";
}

export function isReadyFormulation(fact: AnalysisFact): boolean {
  return fact.sentence.trim().length >= 20 && !STUDY_ONLY_PATTERN.test(fact.sentence);
}

export function isInterpretableFinanceFact(fact: AnalysisFact): boolean {
  if (fact.theme !== "finances") return true;
  if (fact.confidence === "low") return false;
  return (fact.limitations?.length ?? 0) <= 1;
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

  if (fact.target === "watchPoints" && !isWatchPointPriorityTheme(fact.theme)) {
    score -= 8;
  }

  if ((fact.limitations?.length ?? 0) >= 2) {
    score += 5;
  }

  return Math.max(0, score);
}

/** Score orienté sélection des points d'attention (pondération légère, non impérative). */
export function scoreWatchPointCandidate(
  fact: AnalysisFact,
  context: ScoreContext,
): number {
  let score = scoreAnalysisFact(fact, context);

  if (fact.target === "watchPoints") {
    score += 6;
  }

  if (isWatchPointPriorityTheme(fact.theme)) {
    score += 5;
  }

  if (fact.confidence === "high") {
    score += 4;
  }

  if (hasRobustIndicator(fact)) {
    score += 3;
  }

  if (isReadyFormulation(fact)) {
    score += 2;
  }

  if (fact.theme === "finances" && !isInterpretableFinanceFact(fact)) {
    score -= 12;
  }

  return Math.max(0, score);
}

export function isEligibleWatchPointUpgrade(
  fact: AnalysisFact,
  context: ScoreContext,
): boolean {
  if (fact.confidence !== "high") return false;
  if (!isWatchPointPriorityTheme(fact.theme)) return false;
  if (!hasRobustIndicator(fact)) return false;
  if (!isReadyFormulation(fact)) return false;
  if (!isInterpretableFinanceFact(fact)) return false;
  return scoreWatchPointCandidate(fact, context) >= 40;
}

export function isStudyOnlyFact(fact: AnalysisFact): boolean {
  return STUDY_ONLY_PATTERN.test(fact.sentence);
}

export function isActionableOpportunity(fact: AnalysisFact): boolean {
  if (fact.target !== "opportunities") return false;
  if (isStudyOnlyFact(fact)) return false;
  if (fact.theme === "security") return false;
  return true;
}
