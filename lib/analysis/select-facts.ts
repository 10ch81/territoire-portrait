import type { TerritoryProfile } from "../types";
import {
  areSemanticallySimilar,
  dedupeSelectedFacts,
  indicatorKeys,
} from "./dedupe-facts";
import type { AnalysisFact, AnalysisFactTarget, AnalysisFactTheme } from "./types";
import {
  isActionableOpportunity,
  isEligibleWatchPointUpgrade,
  isStudyOnlyFact,
  scoreAnalysisFact,
  scoreWatchPointCandidate,
  type ScoreContext,
} from "./score-facts";
import {
  WATCH_POINT_FAMILIES,
} from "./watch-point-coverage";

export {
  countRobustWatchPointFamilies,
  missingWatchPointFamilies,
  WATCH_POINT_FAMILIES,
} from "./watch-point-coverage";

const TARGET_LIMITS: Record<AnalysisFactTarget, { min: number; max: number }> = {
  summary: { min: 2, max: 4 },
  strengths: { min: 3, max: 5 },
  watchPoints: { min: 2, max: 4 },
  opportunities: { min: 2, max: 5 },
};

const SUMMARY_THEMES: AnalysisFactTheme[] = ["identity", "centrality", "demography"];

const STRENGTH_SLOTS: AnalysisFactTheme[][] = [
  ["centrality"],
  ["equipments"],
  ["public_services"],
  ["employment_sectors"],
  ["health"],
  ["education"],
  ["connectivity"],
  ["tourism"],
  ["economy"],
  ["mobility", "energy"],
];

const WATCH_POINT_SLOTS: AnalysisFactTheme[][] = WATCH_POINT_FAMILIES;

const STRENGTH_THEME_CONFLICTS: Array<[AnalysisFactTheme, AnalysisFactTheme]> = [
  ["tourism", "public_services"],
  ["security", "risks"],
  ["economy", "employment_sectors"],
  ["equipments", "education"],
  ["equipments", "health"],
  ["mobility", "connectivity"],
  ["energy", "connectivity"],
];

const OPPORTUNITY_SLOTS: AnalysisFactTheme[][] = [
  ["housing"],
  ["ess_rge"],
  ["risks"],
  ["connectivity"],
  ["tourism"],
  ["mobility"],
  ["education", "health"],
  ["public_services"],
  ["policy_city"],
];

const STRICT_ONE_THEME_TARGETS: AnalysisFactTarget[] = [
  "watchPoints",
  "opportunities",
];

const SUMMARY_EXCLUDED_THEMES: AnalysisFactTheme[] = [
  "employment_sectors",
  "equipments",
  "energy",
  "real_estate",
  "finances",
];

function themesConflict(
  a: AnalysisFact,
  b: AnalysisFact,
  target?: AnalysisFactTarget,
): boolean {
  if (target === "watchPoints") {
    return false;
  }

  const pairs =
    target === "strengths"
      ? STRENGTH_THEME_CONFLICTS
      : ([
          ["security", "risks"],
          ["economy", "employment_sectors"],
          ["equipments", "education"],
          ["equipments", "health"],
          ["mobility", "connectivity"],
          ["energy", "connectivity"],
        ] as Array<[AnalysisFactTheme, AnalysisFactTheme]>);

  return pairs.some(
    ([t1, t2]) =>
      (a.theme === t1 && b.theme === t2) || (a.theme === t2 && b.theme === t1),
  );
}

function sharesIndicator(a: AnalysisFact, b: AnalysisFact): boolean {
  const keysA = new Set(indicatorKeys(a));
  return indicatorKeys(b).some((key) => keysA.has(key));
}

function canAddToTarget(
  candidate: AnalysisFact,
  selected: AnalysisFact[],
  target: AnalysisFactTarget,
): boolean {
  if (selected.some((f) => f.id === candidate.id)) return false;

  const sameTarget = selected.filter((f) => f.target === target);

  if (sameTarget.some((existing) => sharesIndicator(existing, candidate))) {
    return false;
  }

  if (sameTarget.some((existing) => areSemanticallySimilar(existing, candidate))) {
    return false;
  }

  if (sameTarget.some((existing) => themesConflict(existing, candidate, target))) {
    return false;
  }

  if (
    STRICT_ONE_THEME_TARGETS.includes(target) &&
    sameTarget.some((existing) => existing.theme === candidate.theme)
  ) {
    return false;
  }

  if (
    candidate.confidence === "low" &&
    sameTarget.some(
      (other) => other.theme === candidate.theme && other.confidence !== "low",
    )
  ) {
    return false;
  }

  if (target === "summary" && SUMMARY_EXCLUDED_THEMES.includes(candidate.theme)) {
    return false;
  }

  if (target === "opportunities") {
    if (isStudyOnlyFact(candidate)) return false;
    if (candidate.theme === "security") return false;
    if (!isActionableOpportunity(candidate)) return false;
  }

  return true;
}

function pickBestFromThemes(
  candidates: AnalysisFact[],
  themes: AnalysisFactTheme[],
  context: ScoreContext,
  selected: AnalysisFact[],
  target: AnalysisFactTarget,
): AnalysisFact | null {
  const scoreFn = target === "watchPoints" ? scoreWatchPointCandidate : scoreAnalysisFact;
  const themed = candidates
    .filter((f) => themes.includes(f.theme))
    .sort((a, b) => scoreFn(b, context) - scoreFn(a, context));

  for (const candidate of themed) {
    if (canAddToTarget(candidate, selected, target)) {
      return candidate;
    }
  }
  return null;
}

function fillTargetFromSlots(
  facts: AnalysisFact[],
  target: AnalysisFactTarget,
  context: ScoreContext,
  selected: AnalysisFact[],
  slots: AnalysisFactTheme[][],
): void {
  const limit = TARGET_LIMITS[target];
  const scoreFn = target === "watchPoints" ? scoreWatchPointCandidate : scoreAnalysisFact;
  const candidates = facts
    .filter((f) => f.target === target)
    .sort((a, b) => scoreFn(b, context) - scoreFn(a, context));

  for (const slotThemes of slots) {
    if (selected.filter((f) => f.target === target).length >= limit.max) break;
    const pick = pickBestFromThemes(candidates, slotThemes, context, selected, target);
    if (pick) selected.push(pick);
  }

  for (const candidate of candidates) {
    if (selected.filter((f) => f.target === target).length >= limit.max) break;
    if (canAddToTarget(candidate, selected, target)) {
      selected.push(candidate);
    }
  }
}

function ensureWatchPointsMinimum(
  facts: AnalysisFact[],
  selected: AnalysisFact[],
  context: ScoreContext,
): void {
  const limit = TARGET_LIMITS.watchPoints;
  const targetCount = Math.min(3, limit.max);
  let watchCount = selected.filter((f) => f.target === "watchPoints").length;

  while (watchCount < targetCount && watchCount < limit.max) {
    const candidates = facts
      .filter((f) => f.target === "watchPoints" && f.confidence !== "low")
      .sort(
        (a, b) => scoreWatchPointCandidate(b, context) - scoreWatchPointCandidate(a, context),
      );

    const next = candidates.find((c) => canAddToTarget(c, selected, "watchPoints"));
    if (!next) break;

    selected.push(next);
    watchCount += 1;
  }
}

function rebalanceWatchPointPriority(
  facts: AnalysisFact[],
  selected: AnalysisFact[],
  context: ScoreContext,
): void {
  const watchIndices = selected
    .map((fact, index) => ({ fact, index }))
    .filter(({ fact }) => fact.target === "watchPoints");

  if (watchIndices.length === 0) return;

  const upgradeCandidates = facts
    .filter(
      (fact) =>
        !selected.some((existing) => existing.id === fact.id) &&
        isEligibleWatchPointUpgrade(fact, context),
    )
    .map((fact) =>
      fact.target === "watchPoints" ? fact : { ...fact, target: "watchPoints" as const },
    )
    .sort(
      (a, b) => scoreWatchPointCandidate(b, context) - scoreWatchPointCandidate(a, context),
    );

  for (const candidate of upgradeCandidates) {
    let weakestIndex = -1;
    let weakestScore = Infinity;

    for (const { fact, index } of watchIndices) {
      const score = scoreWatchPointCandidate(fact, context);
      if (score < weakestScore) {
        weakestScore = score;
        weakestIndex = index;
      }
    }

    if (weakestIndex < 0) break;

    const candidateScore = scoreWatchPointCandidate(candidate, context);
    if (candidateScore <= weakestScore) continue;

    const withoutWeakest = selected.filter((_, index) => index !== weakestIndex);
    if (!canAddToTarget(candidate, withoutWeakest, "watchPoints")) continue;

    selected[weakestIndex] = candidate;
    watchIndices[watchIndices.findIndex(({ index }) => index === weakestIndex)] = {
      fact: candidate,
      index: weakestIndex,
    };
  }
}

function resolveWatchPointTargetCount(
  watchFacts: AnalysisFact[],
  context: ScoreContext,
): number {
  if (watchFacts.length <= 3) return watchFacts.length;

  const scored = watchFacts
    .map((fact) => ({ fact, score: scoreWatchPointCandidate(fact, context) }))
    .sort((a, b) => b.score - a.score);

  const topFour = scored.slice(0, 4);
  const themes = new Set(topFour.map(({ fact }) => fact.theme));

  if (topFour.length < 4 || themes.size < 4) {
    return 3;
  }

  const thirdScore = topFour[2].score;
  const fourthScore = topFour[3].score;
  const scoresAreClose = fourthScore >= thirdScore - 12;
  const scoresAreStrong = thirdScore >= 45 && fourthScore >= 42;

  return scoresAreClose && scoresAreStrong ? 4 : 3;
}

function trimWatchPointsToTarget(
  selected: AnalysisFact[],
  context: ScoreContext,
): void {
  const watchFacts = selected.filter((fact) => fact.target === "watchPoints");
  const targetCount = resolveWatchPointTargetCount(watchFacts, context);

  if (watchFacts.length <= targetCount) return;

  const ranked = watchFacts
    .map((fact) => ({ fact, score: scoreWatchPointCandidate(fact, context) }))
    .sort((a, b) => b.score - a.score);

  const keepIds = new Set(ranked.slice(0, targetCount).map(({ fact }) => fact.id));

  for (let index = selected.length - 1; index >= 0; index -= 1) {
    const fact = selected[index];
    if (fact.target === "watchPoints" && !keepIds.has(fact.id)) {
      selected.splice(index, 1);
    }
  }
}

export function groupFactsByTarget(
  facts: AnalysisFact[],
): Record<AnalysisFactTarget, AnalysisFact[]> {
  const groups: Record<AnalysisFactTarget, AnalysisFact[]> = {
    summary: [],
    strengths: [],
    watchPoints: [],
    opportunities: [],
  };

  for (const fact of facts) {
    groups[fact.target].push(fact);
  }

  return groups;
}

export function selectAnalysisFactsForPrompt(
  facts: AnalysisFact[],
  territory?: TerritoryProfile,
): AnalysisFact[] {
  const context: ScoreContext = {
    territory: territory ?? {
      name: "",
      inseeCode: "",
      postalCodes: [],
      department: null,
      region: null,
      epci: null,
      population: null,
      densityPerKm2: null,
      coordinates: null,
      surfaceKm2: null,
      sources: [],
      enrichment: null,
    },
  };

  const selected: AnalysisFact[] = [];

  fillTargetFromSlots(facts, "summary", context, selected, [
    SUMMARY_THEMES,
    ["demography", "ageing"],
    ["housing", "employment_sectors"],
  ]);

  fillTargetFromSlots(facts, "strengths", context, selected, STRENGTH_SLOTS);
  fillTargetFromSlots(facts, "watchPoints", context, selected, WATCH_POINT_SLOTS);
  fillTargetFromSlots(facts, "opportunities", context, selected, OPPORTUNITY_SLOTS);

  const hasIdentity = selected.some(
    (f) => f.target === "summary" && SUMMARY_THEMES.includes(f.theme),
  );
  if (!hasIdentity) {
    const candidate =
      facts.find((f) => f.theme === "identity" && f.target === "summary") ??
      facts.find((f) => f.theme === "demography" && f.target === "summary") ??
      facts.find((f) => f.theme === "centrality");

    if (candidate) {
      const summaryCandidate = { ...candidate, target: "summary" as const };
      if (canAddToTarget(summaryCandidate, selected, "summary")) {
        selected.push(summaryCandidate);
      }
    }
  }

  ensureWatchPointsMinimum(facts, selected, context);
  rebalanceWatchPointPriority(facts, selected, context);
  trimWatchPointsToTarget(selected, context);

  return dedupeSelectedFacts(selected, context);
}
