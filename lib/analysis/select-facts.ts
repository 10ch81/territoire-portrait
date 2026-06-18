import type { TerritoryProfile } from "../types";
import {
  areSemanticallySimilar,
  dedupeSelectedFacts,
  indicatorKeys,
} from "./dedupe-facts";
import type { AnalysisFact, AnalysisFactTarget, AnalysisFactTheme } from "./types";
import {
  isActionableOpportunity,
  isStudyOnlyFact,
  scoreAnalysisFact,
  type ScoreContext,
} from "./score-facts";
import {
  countRobustWatchPointFamilies,
  missingWatchPointFamilies,
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
  watchPoints: { min: 3, max: 5 },
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
  const themed = candidates
    .filter((f) => themes.includes(f.theme))
    .sort((a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context));

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
  const candidates = facts
    .filter((f) => f.target === target)
    .sort((a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context));

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

function ensureMandatoryWatchThemes(
  facts: AnalysisFact[],
  selected: AnalysisFact[],
  context: ScoreContext,
  themes: AnalysisFactTheme[],
): void {
  for (const theme of themes) {
    if (selected.some((f) => f.target === "watchPoints" && f.theme === theme)) {
      continue;
    }

    const candidate = facts
      .filter((f) => f.theme === theme)
      .sort((a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context))[0];

    if (!candidate) continue;

    const watchCandidate: AnalysisFact = {
      ...candidate,
      target: "watchPoints",
    };

    if (canAddToTarget(watchCandidate, selected, "watchPoints")) {
      selected.push(watchCandidate);
    }
  }
}

function ensureWatchPointsMinimum(
  facts: AnalysisFact[],
  selected: AnalysisFact[],
  context: ScoreContext,
): void {
  const limit = TARGET_LIMITS.watchPoints;
  const robustFamilies = countRobustWatchPointFamilies(facts);
  const minimum =
    robustFamilies >= 4 ? Math.min(limit.max, Math.max(3, limit.min)) : limit.min;

  let watchCount = selected.filter((f) => f.target === "watchPoints").length;

  for (const family of missingWatchPointFamilies(facts, selected)) {
    if (watchCount >= limit.max || watchCount >= minimum) break;

    const pick = pickBestFromThemes(
      facts.filter((f) => f.target === "watchPoints" || family.includes(f.theme)),
      family,
      context,
      selected,
      "watchPoints",
    );

    if (pick) {
      const watchPick =
        pick.target === "watchPoints" ? pick : { ...pick, target: "watchPoints" as const };
      if (canAddToTarget(watchPick, selected, "watchPoints")) {
        selected.push(watchPick);
        watchCount += 1;
      }
    }
  }

  while (watchCount < minimum && watchCount < limit.max) {
    const candidates = facts
      .filter((f) => f.target === "watchPoints")
      .sort((a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context));

    const next = candidates.find((c) => canAddToTarget(c, selected, "watchPoints"));
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
  ensureMandatoryWatchThemes(facts, selected, context, ["security", "risks"]);

  return dedupeSelectedFacts(selected, context);
}
