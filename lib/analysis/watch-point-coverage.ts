import type { AnalysisFact, AnalysisFactTheme } from "./types";

/** Familles d'enjeux prioritaires pour les points d'attention (ordre de sélection). */
export const PRIORITY_WATCH_POINT_FAMILIES: AnalysisFactTheme[][] = [
  ["demography"],
  ["ageing"],
  ["employment", "income"],
  ["housing", "social_housing"],
  ["risks"],
  ["security"],
];

/** Familles complémentaires après les enjeux majeurs. */
export const SECONDARY_WATCH_POINT_FAMILIES: AnalysisFactTheme[][] = [
  ["mobility"],
  ["policy_city"],
];

/** Toutes les familles éligibles pour les points d'attention. */
export const WATCH_POINT_FAMILIES: AnalysisFactTheme[][] = [
  ...PRIORITY_WATCH_POINT_FAMILIES,
  ...SECONDARY_WATCH_POINT_FAMILIES,
];

function factMatchesFamily(fact: AnalysisFact, family: AnalysisFactTheme[]): boolean {
  return family.includes(fact.theme);
}

/** Indique si un constat signale un enjeu éligible aux points d'attention. */
export function signalsWatchPointIssue(fact: AnalysisFact): boolean {
  if (fact.confidence === "low") return false;

  switch (fact.theme) {
    case "demography":
    case "ageing":
    case "employment":
    case "housing":
    case "social_housing":
      return fact.target === "watchPoints";
    case "risks":
    case "security":
      return true;
    case "income":
      return fact.target === "watchPoints";
    default:
      return false;
  }
}

export function familyHasIssueSignal(
  facts: AnalysisFact[],
  family: AnalysisFactTheme[],
): boolean {
  return facts.some((f) => factMatchesFamily(f, family) && signalsWatchPointIssue(f));
}

export function countRobustWatchPointFamilies(facts: AnalysisFact[]): number {
  let count = 0;

  for (const family of WATCH_POINT_FAMILIES) {
    const hasRobust = facts.some(
      (f) => factMatchesFamily(f, family) && f.confidence !== "low",
    );
    if (hasRobust) count += 1;
  }

  return count;
}

export function watchPointThemesInSelection(facts: AnalysisFact[]): Set<AnalysisFactTheme> {
  return new Set(
    facts.filter((f) => f.target === "watchPoints").map((f) => f.theme),
  );
}

function familyIsCovered(family: AnalysisFactTheme[], selected: AnalysisFact[]): boolean {
  const covered = watchPointThemesInSelection(selected);
  return family.some((theme) => covered.has(theme));
}

export function missingWatchPointFamilies(
  allFacts: AnalysisFact[],
  selected: AnalysisFact[],
): AnalysisFactTheme[][] {
  return WATCH_POINT_FAMILIES.filter((family) => {
    const available = allFacts.some(
      (f) => factMatchesFamily(f, family) && f.confidence !== "low",
    );
    if (!available) return false;
    return !familyIsCovered(family, selected);
  });
}

/** Familles prioritaires avec enjeu signalé mais absentes de la sélection watchPoints. */
export function missingIssueWatchPointFamilies(
  allFacts: AnalysisFact[],
  selected: AnalysisFact[],
): AnalysisFactTheme[][] {
  return PRIORITY_WATCH_POINT_FAMILIES.filter((family) => {
    if (!familyHasIssueSignal(allFacts, family)) return false;
    return !familyIsCovered(family, selected);
  });
}

const SECONDARY_WATCH_THEMES = new Set<AnalysisFactTheme>(
  SECONDARY_WATCH_POINT_FAMILIES.flat(),
);

/** Retire un watchPoint secondaire ou non prioritaire pour faire place à un enjeu majeur. */
export function findRemovableWatchPoint(
  selected: AnalysisFact[],
  protectedFamily: AnalysisFactTheme[],
  scoreFn: (fact: AnalysisFact) => number,
): AnalysisFact | null {
  const watchPoints = selected.filter((f) => f.target === "watchPoints");
  if (watchPoints.length === 0) return null;

  const protectedThemes = new Set(protectedFamily);

  const candidates = watchPoints
    .filter((f) => !protectedThemes.has(f.theme))
    .filter((f) => SECONDARY_WATCH_THEMES.has(f.theme) || !signalsWatchPointIssue(f))
    .sort((a, b) => scoreFn(a) - scoreFn(b));

  return candidates[0] ?? null;
}
