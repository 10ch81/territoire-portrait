import type { AnalysisFact, AnalysisFactTarget, AnalysisFactTheme } from "./types";

/** Limites communes sélection serveur ↔ consignes Mistral. */
export const ANALYSIS_OUTPUT_LIMITS = {
  summary: { minFacts: 2, maxFacts: 4, sentences: 2 },
  strengths: { min: 3, max: 4 },
  watchPoints: { min: 3, max: 5 },
  opportunities: { min: 2, max: 4 },
} as const;

export type PromptOutputTarget = keyof typeof ANALYSIS_OUTPUT_LIMITS;

export const TARGET_LIMITS: Record<
  AnalysisFactTarget,
  { min: number; max: number }
> = {
  summary: {
    min: ANALYSIS_OUTPUT_LIMITS.summary.minFacts,
    max: ANALYSIS_OUTPUT_LIMITS.summary.maxFacts,
  },
  strengths: { ...ANALYSIS_OUTPUT_LIMITS.strengths },
  watchPoints: { ...ANALYSIS_OUTPUT_LIMITS.watchPoints },
  opportunities: { ...ANALYSIS_OUTPUT_LIMITS.opportunities },
};

/** Priorité de conservation quand les watchPoints dépassent la limite max. */
export const WATCH_POINT_RETENTION_PRIORITY: AnalysisFactTheme[] = [
  "demography",
  "ageing",
  "security",
  "risks",
  "housing",
  "social_housing",
  "employment",
  "income",
  "mobility",
  "policy_city",
];

export function countSelectedByTarget(
  facts: AnalysisFact[],
  target: AnalysisFactTarget,
): number {
  return facts.filter((f) => f.target === target).length;
}

export function buildExpectedOutputInstructions(facts: AnalysisFact[]): string {
  const summaryCount = countSelectedByTarget(facts, "summary");
  const strengthsCount = countSelectedByTarget(facts, "strengths");
  const watchCount = countSelectedByTarget(facts, "watchPoints");
  const opportunitiesCount = countSelectedByTarget(facts, "opportunities");

  return [
    "Volumes attendus (alignés sur les constats fournis) :",
    `- summary : ${ANALYSIS_OUTPUT_LIMITS.summary.sentences} phrases maximum, en s'appuyant sur les ${summaryCount} constat(s) summary.`,
    `- strengths : exactement ${strengthsCount} point(s) fort(s) — un par constat strengths reçu, sans en omettre.`,
    `- watchPoints : exactement ${watchCount} point(s) d'attention — un par constat watchPoints reçu, sans en omettre ni fusionner.`,
    `- opportunities : exactement ${opportunitiesCount} opportunité(s) — une par constat opportunities reçu, sans en omettre.`,
  ].join("\n");
}

export function buildMistralStructureBlock(): string {
  const { summary, strengths, watchPoints, opportunities } = ANALYSIS_OUTPUT_LIMITS;

  return `Structure attendue :
{
  "summary": "résumé court en ${summary.sentences} phrases maximum",
  "strengths": ["${strengths.min} à ${strengths.max} points forts — autant que de constats strengths fournis"],
  "watchPoints": ["${watchPoints.min} à ${watchPoints.max} points d'attention — autant que de constats watchPoints fournis"],
  "opportunities": ["${opportunities.min} à ${opportunities.max} opportunités — autant que de constats opportunities fournis"]
}`;
}

export function watchPointRetentionRank(theme: AnalysisFactTheme): number {
  const index = WATCH_POINT_RETENTION_PRIORITY.indexOf(theme);
  return index >= 0 ? index : WATCH_POINT_RETENTION_PRIORITY.length + 10;
}
