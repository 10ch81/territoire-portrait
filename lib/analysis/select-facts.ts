import type { TerritoryProfile } from "../types";
import type { AnalysisFact, AnalysisFactTarget, AnalysisFactTheme } from "./types";
import {
  isActionableOpportunity,
  isStudyOnlyFact,
  scoreAnalysisFact,
  type ScoreContext,
} from "./score-facts";

const TARGET_LIMITS: Record<AnalysisFactTarget, { min: number; max: number }> = {
  summary: { min: 2, max: 4 },
  strengths: { min: 3, max: 5 },
  watchPoints: { min: 3, max: 5 },
  opportunities: { min: 3, max: 5 },
};

const IDENTITY_THEMES: AnalysisFactTheme[] = ["identity", "centrality", "demography"];
const SERVICE_THEMES: AnalysisFactTheme[] = [
  "equipments",
  "education",
  "health",
  "public_services",
];
const ECONOMY_THEMES: AnalysisFactTheme[] = ["economy", "employment_sectors", "ess_rge"];
const DEMO_THEMES: AnalysisFactTheme[] = ["demography", "ageing", "identity"];
const HOUSING_THEMES: AnalysisFactTheme[] = ["housing", "social_housing"];
const SPECIFIC_THEMES: AnalysisFactTheme[] = [
  "risks",
  "security",
  "mobility",
  "tourism",
  "policy_city",
  "connectivity",
  "finances",
  "energy",
  "real_estate",
];

function factSignature(fact: AnalysisFact): string {
  const bindingKey = (fact.numericBindings ?? [])
    .map((b) => `${b.theme}:${b.label}:${b.value}`)
    .join("|");
  return `${fact.theme}:${fact.sentence.slice(0, 80)}:${bindingKey}`;
}

function themesConflict(a: AnalysisFact, b: AnalysisFact): boolean {
  const pairs: Array<[string, string]> = [
    ["security", "risks"],
    ["economy", "employment_sectors"],
    ["equipments", "education"],
    ["equipments", "health"],
    ["mobility", "connectivity"],
    ["energy", "connectivity"],
  ];

  return pairs.some(
    ([t1, t2]) =>
      (a.theme === t1 && b.theme === t2) || (a.theme === t2 && b.theme === t1),
  );
}

function canAdd(
  candidate: AnalysisFact,
  selected: AnalysisFact[],
  target: AnalysisFactTarget,
): boolean {
  if (selected.some((f) => f.id === candidate.id)) return false;

  const signature = factSignature(candidate);
  if (selected.some((f) => factSignature(f) === signature)) return false;

  const sameTarget = selected.filter((f) => f.target === target);
  if (sameTarget.some((existing) => themesConflict(existing, candidate))) {
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
    if (canAdd(candidate, selected, target)) {
      return candidate;
    }
  }
  return null;
}

function fillTarget(
  facts: AnalysisFact[],
  target: AnalysisFactTarget,
  context: ScoreContext,
  selected: AnalysisFact[],
  coverageSlots: Array<AnalysisFactTheme[]>,
): void {
  const limit = TARGET_LIMITS[target];
  const candidates = facts
    .filter((f) => f.target === target)
    .sort((a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context));

  for (const slotThemes of coverageSlots) {
    if (selected.filter((f) => f.target === target).length >= limit.max) break;
    const pick = pickBestFromThemes(candidates, slotThemes, context, selected, target);
    if (pick) selected.push(pick);
  }

  for (const candidate of candidates) {
    if (selected.filter((f) => f.target === target).length >= limit.max) break;
    if (canAdd(candidate, selected, target)) {
      selected.push(candidate);
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

  const summarySlots = [IDENTITY_THEMES, DEMO_THEMES, ECONOMY_THEMES, HOUSING_THEMES];
  fillTarget(facts, "summary", context, selected, summarySlots);

  const strengthSlots = [
    SERVICE_THEMES,
    ECONOMY_THEMES,
    ["connectivity", "public_services"] as AnalysisFactTheme[],
    ["tourism", "employment_sectors"] as AnalysisFactTheme[],
  ];
  fillTarget(facts, "strengths", context, selected, strengthSlots);

  const watchSlots = [
    HOUSING_THEMES,
    ["employment", "income"] as AnalysisFactTheme[],
    ["ageing", "demography"] as AnalysisFactTheme[],
    ["policy_city", "security", "risks"] as AnalysisFactTheme[],
  ];
  fillTarget(facts, "watchPoints", context, selected, watchSlots);

  const opportunitySlots = [
    ["housing", "ess_rge", "risks"] as AnalysisFactTheme[],
    ["connectivity", "tourism", "mobility"] as AnalysisFactTheme[],
    ["education", "public_services", "policy_city"] as AnalysisFactTheme[],
  ];
  fillTarget(facts, "opportunities", context, selected, opportunitySlots);

  const hasIdentity = selected.some(
    (f) => f.target === "summary" && IDENTITY_THEMES.includes(f.theme),
  );
  if (!hasIdentity) {
    const candidate =
      facts.find((f) => f.theme === "identity" && f.target === "summary") ??
      facts.find((f) => f.theme === "demography");
    if (candidate && canAdd({ ...candidate, target: "summary" }, selected, "summary")) {
      selected.push({ ...candidate, target: "summary" });
    }
  }

  const hasSpecific = selected.some((f) => SPECIFIC_THEMES.includes(f.theme));
  if (!hasSpecific) {
    const specific = facts
      .filter((f) => SPECIFIC_THEMES.includes(f.theme))
      .sort((a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context));
    for (const candidate of specific) {
      if (canAdd(candidate, selected, candidate.target)) {
        selected.push(candidate);
        break;
      }
    }
  }

  for (const theme of ["security", "risks"] as AnalysisFactTheme[]) {
    const fact = facts.find((f) => f.theme === theme);
    if (fact && !selected.some((f) => f.id === fact.id)) {
      selected.push(fact);
    }
  }

  return selected;
}
