import type { AnalysisFact, AnalysisFactTheme } from "./types";

/** Familles d'enjeux éligibles pour les points d'attention. */
export const WATCH_POINT_FAMILIES: AnalysisFactTheme[][] = [
  ["demography"],
  ["ageing"],
  ["employment", "income"],
  ["housing", "social_housing"],
  ["risks"],
  ["security"],
  ["mobility"],
  ["policy_city"],
];

function factMatchesFamily(fact: AnalysisFact, family: AnalysisFactTheme[]): boolean {
  return family.includes(fact.theme);
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

export function missingWatchPointFamilies(
  allFacts: AnalysisFact[],
  selected: AnalysisFact[],
): AnalysisFactTheme[][] {
  const covered = watchPointThemesInSelection(selected);

  return WATCH_POINT_FAMILIES.filter((family) => {
    const available = allFacts.some(
      (f) => factMatchesFamily(f, family) && f.confidence !== "low",
    );
    if (!available) return false;

    return !family.some((theme) => covered.has(theme));
  });
}
