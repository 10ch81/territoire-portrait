import type { TerritoryProfile } from "../types";
import {
  areSemanticallySimilar,
  dedupeSelectedFacts,
  indicatorKeys,
} from "./dedupe-facts";
import {
  TARGET_LIMITS,
  watchPointRetentionRank,
} from "./prompt-limits";
import type {
  AnalysisFact,
  AnalysisFactTarget,
  AnalysisFactTheme,
  QualifiedAnalysisFact,
} from "./types";
import {
  applyProgressiveCaution,
  indexQualifiedFacts,
  isProgressiveOpportunityEligible,
  isProgressiveWatchPointEligible,
  resolveOpportunityGenericityScore,
} from "./progressive-qualification";
import {
  hasOpportunityTraceability,
  isStudyOnlyOpportunity,
} from "./opportunity-quality";
import {
  isActionableOpportunity,
  scoreAnalysisFact,
  type ScoreContext,
} from "./score-facts";
import {
  selectOpportunityFacts,
} from "./opportunities";
import {
  countQualifiedWatchPointCandidates,
  isEligibleEmploymentWatchPoint,
  isFactEligibleForWatchPoint,
  qualifiedWatchPointCandidates,
  qualifyAnalysisFacts,
} from "./qualify-facts";

import {
  countRobustWatchPointFamilies,
  missingWatchPointFamilies,
  WATCH_POINT_FAMILIES,
} from "./watch-point-coverage";

export {
  ANALYSIS_OUTPUT_LIMITS,
  TARGET_LIMITS,
  buildExpectedOutputInstructions,
} from "./prompt-limits";
export {
  countRobustWatchPointFamilies,
  missingWatchPointFamilies,
  WATCH_POINT_FAMILIES,
} from "./watch-point-coverage";

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
  "geography",
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
  context?: ScoreContext,
  qualificationById?: Map<string, QualifiedAnalysisFact>,
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
    if (isStudyOnlyOpportunity(candidate.sentence)) return false;
    if (!isActionableOpportunity(candidate)) return false;
    if (!hasOpportunityTraceability(candidate)) return false;

    const qualified = qualificationById?.get(candidate.id);
    if (qualified && context?.territory) {
      const relatedWatchPointThemes = selected
        .filter((f) => f.target === "watchPoints")
        .map((f) => f.theme);
      const liveGenericity = resolveOpportunityGenericityScore(
        candidate,
        context.territory,
        relatedWatchPointThemes,
      );
      if (!isProgressiveOpportunityEligible(qualified, liveGenericity)) {
        return false;
      }
    }
  }

  if (
    target === "watchPoints" &&
    context?.territory
  ) {
    const analysisContext = { territory: context.territory };
    if (!isFactEligibleForWatchPoint(candidate, analysisContext)) {
      return false;
    }

    const qualified = qualificationById?.get(candidate.id);
    if (qualified && !isProgressiveWatchPointEligible(qualified)) {
      return false;
    }
  }

  return true;
}

function pickBestFromThemes(
  candidates: AnalysisFact[],
  themes: AnalysisFactTheme[],
  context: ScoreContext,
  selected: AnalysisFact[],
  target: AnalysisFactTarget,
  qualificationById?: Map<string, QualifiedAnalysisFact>,
): AnalysisFact | null {
  const themed = candidates
    .filter((f) => themes.includes(f.theme))
    .sort((a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context));

  for (const candidate of themed) {
    if (canAddToTarget(candidate, selected, target, context, qualificationById)) {
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
  qualificationById?: Map<string, QualifiedAnalysisFact>,
): void {
  const limit = TARGET_LIMITS[target];
  const candidates = facts
    .filter((f) => f.target === target)
    .sort((a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context));

  for (const slotThemes of slots) {
    if (selected.filter((f) => f.target === target).length >= limit.max) break;
    const pick = pickBestFromThemes(
      candidates,
      slotThemes,
      context,
      selected,
      target,
      qualificationById,
    );
    if (pick) selected.push(pick);
  }

  for (const candidate of candidates) {
    if (selected.filter((f) => f.target === target).length >= limit.max) break;
    if (canAddToTarget(candidate, selected, target, context, qualificationById)) {
      selected.push(candidate);
    }
  }
}

function ensureMandatoryWatchThemes(
  facts: AnalysisFact[],
  selected: AnalysisFact[],
  context: ScoreContext,
  themes: AnalysisFactTheme[],
  qualificationById?: Map<string, QualifiedAnalysisFact>,
): void {
  const limit = TARGET_LIMITS.watchPoints;
  const analysisContext = { territory: context.territory };

  for (const theme of themes) {
    if (selected.some((f) => f.target === "watchPoints" && f.theme === theme)) {
      continue;
    }

    const candidate = facts
      .filter((f) => f.theme === theme)
      .sort((a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context))[0];

    if (!candidate) continue;
    if (!isFactEligibleForWatchPoint(candidate, analysisContext)) continue;

    const watchCandidate: AnalysisFact = {
      ...candidate,
      target: "watchPoints",
    };

    if (canAddToTarget(watchCandidate, selected, "watchPoints", context, qualificationById)) {
      selected.push(watchCandidate);
      continue;
    }

    const watchPoints = selected.filter((f) => f.target === "watchPoints");
    if (watchPoints.length < limit.max) continue;

    const lowestPriorityIndex = watchPoints.reduce((worst, fact, index, list) => {
      const rank = watchPointRetentionRank(fact.theme);
      const worstRank = watchPointRetentionRank(list[worst].theme);
      return rank > worstRank ? index : worst;
    }, 0);

    const mandatoryRank = watchPointRetentionRank(theme);
    if (mandatoryRank >= watchPointRetentionRank(watchPoints[lowestPriorityIndex].theme)) {
      continue;
    }

    selected.splice(selected.indexOf(watchPoints[lowestPriorityIndex]), 1);
    if (canAddToTarget(watchCandidate, selected, "watchPoints", context, qualificationById)) {
      selected.push(watchCandidate);
    }
  }
}

function reconcileSummaryDemographyWatchSlot(
  facts: AnalysisFact[],
  selected: AnalysisFact[],
  context: ScoreContext,
  qualificationById?: Map<string, QualifiedAnalysisFact>,
): void {
  const hasSummaryDemography = selected.some(
    (fact) => fact.theme === "demography" && fact.target === "summary",
  );
  if (!hasSummaryDemography) return;

  for (let index = selected.length - 1; index >= 0; index -= 1) {
    const fact = selected[index]!;
    if (fact.target === "watchPoints" && fact.theme === "demography") {
      selected.splice(index, 1);
    }
  }

  if (selected.some((fact) => fact.theme === "employment" && fact.target === "watchPoints")) {
    return;
  }

  const employment =
    facts.find((fact) => fact.theme === "employment" && fact.target === "watchPoints") ??
    facts.find((fact) => fact.theme === "employment");
  if (!employment) return;
  if (!isEligibleEmploymentWatchPoint(employment, context.territory)) return;

  const watchEmployment: AnalysisFact =
    employment.target === "watchPoints"
      ? employment
      : { ...employment, target: "watchPoints" };

  const limit = TARGET_LIMITS.watchPoints;
  const watchCount = selected.filter((fact) => fact.target === "watchPoints").length;

  if (watchCount < limit.max && canAddToTarget(watchEmployment, selected, "watchPoints", context, qualificationById)) {
    selected.push(watchEmployment);
    return;
  }

  const displaceableThemes: AnalysisFactTheme[] = [
    "social_housing",
    "policy_city",
    "mobility",
    "income",
  ];
  const watchPoints = selected.filter((fact) => fact.target === "watchPoints");
  const replaceFact =
    watchPoints.find((fact) => displaceableThemes.includes(fact.theme)) ??
    watchPoints.reduce((lowest, fact) =>
      watchPointRetentionRank(fact.theme) > watchPointRetentionRank(lowest.theme)
        ? fact
        : lowest,
    );

  selected.splice(selected.indexOf(replaceFact), 1);
  if (canAddToTarget(watchEmployment, selected, "watchPoints", context, qualificationById)) {
    selected.push(watchEmployment);
  }
}

function trimTargetToLimit(
  selected: AnalysisFact[],
  target: AnalysisFactTarget,
  context: ScoreContext,
): void {
  const limit = TARGET_LIMITS[target];
  const targetFacts = selected.filter((f) => f.target === target);

  if (targetFacts.length <= limit.max) return;

  const ranked = targetFacts
    .map((fact) => ({
      fact,
      rank:
        target === "watchPoints"
          ? watchPointRetentionRank(fact.theme)
          : -scoreAnalysisFact(fact, context),
    }))
    .sort((a, b) => a.rank - b.rank || scoreAnalysisFact(b.fact, context) - scoreAnalysisFact(a.fact, context));

  const keepIds = new Set(ranked.slice(0, limit.max).map(({ fact }) => fact.id));

  for (let index = selected.length - 1; index >= 0; index -= 1) {
    const fact = selected[index];
    if (fact.target === target && !keepIds.has(fact.id)) {
      selected.splice(index, 1);
    }
  }
}

function ensureWatchPointsMinimum(
  facts: AnalysisFact[],
  selected: AnalysisFact[],
  context: ScoreContext,
  qualificationById?: Map<string, QualifiedAnalysisFact>,
): void {
  const limit = TARGET_LIMITS.watchPoints;
  const analysisContext = { territory: context.territory };
  const qualifiedAvailable = countQualifiedWatchPointCandidates(facts, analysisContext);

  if (qualifiedAvailable === 0) {
    return;
  }

  const minimum = Math.min(limit.max, qualifiedAvailable);

  let watchCount = selected.filter((f) => f.target === "watchPoints").length;

  for (const family of missingWatchPointFamilies(facts, selected)) {
    if (watchCount >= limit.max || watchCount >= minimum) break;

    const pick = pickBestFromThemes(
      qualifiedWatchPointCandidates(
        facts.filter((f) => f.target === "watchPoints" || family.includes(f.theme)),
        analysisContext,
      ),
      family,
      context,
      selected,
      "watchPoints",
      qualificationById,
    );

    if (pick) {
      const watchPick =
        pick.target === "watchPoints" ? pick : { ...pick, target: "watchPoints" as const };
      if (canAddToTarget(watchPick, selected, "watchPoints", context, qualificationById)) {
        selected.push(watchPick);
        watchCount += 1;
      }
    }
  }

  while (watchCount < minimum && watchCount < limit.max) {
    const candidates = qualifiedWatchPointCandidates(facts, analysisContext)
      .filter((f) => f.target === "watchPoints")
      .sort((a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context));

    const next = candidates.find((c) =>
      canAddToTarget(c, selected, "watchPoints", context, qualificationById),
    );
    if (!next) break;

    selected.push(next);
    watchCount += 1;
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

  const analysisContext = { territory: context.territory };
  const qualificationById = indexQualifiedFacts(
    qualifyAnalysisFacts(facts, analysisContext),
  );

  const selected: AnalysisFact[] = [];

  fillTargetFromSlots(facts, "summary", context, selected, [
    SUMMARY_THEMES,
    ["demography", "ageing"],
    ["housing", "employment_sectors"],
  ], qualificationById);

  fillTargetFromSlots(facts, "strengths", context, selected, STRENGTH_SLOTS, qualificationById);
  fillTargetFromSlots(facts, "watchPoints", context, selected, WATCH_POINT_SLOTS, qualificationById);

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
      if (canAddToTarget(summaryCandidate, selected, "summary", context, qualificationById)) {
        selected.push(summaryCandidate);
      }
    }
  }

  ensureWatchPointsMinimum(facts, selected, context, qualificationById);
  ensureMandatoryWatchThemes(facts, selected, context, ["security", "risks"], qualificationById);
  reconcileSummaryDemographyWatchSlot(facts, selected, context, qualificationById);

  const selectedStrengths = selected.filter((fact) => fact.target === "strengths");
  const selectedWatchPoints = selected.filter((fact) => fact.target === "watchPoints");
  for (const opportunity of selectOpportunityFacts(
    facts,
    selectedStrengths,
    selectedWatchPoints,
    context,
  )) {
    if (canAddToTarget(opportunity, selected, "opportunities", context, qualificationById)) {
      selected.push(opportunity);
    }
  }

  trimTargetToLimit(selected, "watchPoints", context);
  trimTargetToLimit(selected, "strengths", context);
  trimTargetToLimit(selected, "opportunities", context);
  trimTargetToLimit(selected, "summary", context);

  const deduped = dedupeSelectedFacts(selected, context);
  return deduped.map((fact) =>
    applyProgressiveCaution(fact, qualificationById.get(fact.id)),
  );
}
