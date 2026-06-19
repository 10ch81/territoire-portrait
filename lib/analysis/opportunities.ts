import type { TerritoryProfile } from "../types";
import { areSemanticallySimilar, indicatorKeys } from "./dedupe-facts";
import {
  ESS_MIN_SIGNIFICANT_COUNT,
  RGE_MIN_SIGNIFICANT_COUNT,
  isAcceptableOpportunity,
  isStudyOnlyOpportunity,
} from "./opportunity-quality";
import {
  qualifiesAsUnemploymentWatchPoint,
  qualifiesAsVacancyWatchPoint,
} from "./qualify-facts";
import type { AnalysisFact, AnalysisFactTheme } from "./types";
import { createFact } from "./builders/utils";
import {
  buildTerritoryContext,
  countTourismContextSignals,
} from "./context/buildTerritoryContext";
import { isMechanicalContextOpportunity } from "./context/context-relevance";
import type { ScoreContext } from "./score-facts";
import type { ComparisonProfile, TerritoryTypology } from "../typology/types";
import { resolveComparisonProfile } from "../typology/thresholds";

export type OpportunityKind =
  | "responds_to_watchpoint"
  | "leverages_strength"
  | "fills_gap"
  | "strategic_context";

export type OpportunityLevel = "low" | "medium" | "high";

export type OpportunityActionFamily =
  | "risk_prevention"
  | "housing_rehabilitation"
  | "digital_services"
  | "local_services"
  | "employment_insertion"
  | "tourism_analysis"
  | "energy_renovation"
  | "mobility_alternatives"
  | "public_services_access"
  | "social_cohesion"
  | "security_prevention"
  | "strategic_context";

export type OpportunityCandidate = {
  fact: AnalysisFact;
  kind: OpportunityKind;
  actionFamily: OpportunityActionFamily;
  actionability: OpportunityLevel;
  evidenceStrength: OpportunityLevel;
  localSpecificity: OpportunityLevel;
  relatedWatchPointThemes: AnalysisFactTheme[];
  relatedStrengthThemes: AnalysisFactTheme[];
  genericPenalty: number;
  redundancyPenalty: number;
  opportunityScore: number;
};

export type OpportunitySelectionContext = {
  territory: TerritoryProfile;
  allFacts: AnalysisFact[];
  selectedStrengths: AnalysisFact[];
  selectedWatchPoints: AnalysisFact[];
};

const LEVEL_SCORE: Record<OpportunityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

/** Seuil ARCEP pour opportunité numérique actionnable (%). */
export const FIBER_OPPORTUNITY_THRESHOLD_PERCENT = 80;

/** Capacité d'hébergement touristique significative (places). */
export const TOURISM_MIN_ACCOMMODATION_PLACES = 200;

/** Score minimal pour considérer une opportunité comme solide. */
export const SOLID_OPPORTUNITY_MIN_SCORE = 5;

export {
  ESS_MIN_SIGNIFICANT_COUNT,
  RGE_MIN_SIGNIFICANT_COUNT,
} from "./opportunity-quality";

const DEFAULT_OPPORTUNITY_TARGET = 3;
const MAX_OPPORTUNITY_COUNT = 4;
const MIN_OPPORTUNITY_COUNT = 2;

const STUDY_ONLY_PATTERN =
  /(?:faire|mener|conduire)\s+(?:une\s+)?(?:analyse|étude)|analyse plus poussée|potentiel touristique à approfondir,\s*faute de/i;

const ACTION_FAMILY_BY_THEME: Partial<Record<AnalysisFactTheme, OpportunityActionFamily>> = {
  housing: "housing_rehabilitation",
  risks: "risk_prevention",
  connectivity: "digital_services",
  tourism: "tourism_analysis",
  ess_rge: "energy_renovation",
  mobility: "mobility_alternatives",
  policy_city: "social_cohesion",
  public_services: "public_services_access",
  education: "local_services",
  employment: "employment_insertion",
  security: "security_prevention",
};

function watchPointThemes(selectedWatchPoints: AnalysisFact[]): Set<AnalysisFactTheme> {
  return new Set(selectedWatchPoints.map((fact) => fact.theme));
}

function strengthThemes(selectedStrengths: AnalysisFact[]): Set<AnalysisFactTheme> {
  return new Set(selectedStrengths.map((fact) => fact.theme));
}

function actionFamilyForFact(fact: AnalysisFact): OpportunityActionFamily {
  return ACTION_FAMILY_BY_THEME[fact.theme] ?? "strategic_context";
}

function isTourismEligible(
  territory: TerritoryProfile,
  selectedStrengths: AnalysisFact[],
): boolean {
  const territoryContext = buildTerritoryContext(territory);
  const hasTourismStrength = selectedStrengths.some((fact) => fact.theme === "tourism");

  if (territoryContext.isTouristCommune !== true) {
    return false;
  }

  return (
    hasTourismStrength ||
    countTourismContextSignals(territory, hasTourismStrength) >= 2
  );
}

function isEssRgeEligible(
  territory: TerritoryProfile,
  _watchThemes: Set<AnalysisFactTheme>,
  relatedWatchPointThemes: AnalysisFactTheme[],
): boolean {
  const enterprises = territory.enrichment?.enterprises;
  const essCount = enterprises?.essCount ?? 0;
  const rgeCount = enterprises?.rgeCount ?? 0;

  if (relatedWatchPointThemes.length === 0) {
    return false;
  }

  if (rgeCount >= RGE_MIN_SIGNIFICANT_COUNT) {
    return true;
  }

  return essCount >= ESS_MIN_SIGNIFICANT_COUNT;
}

function isFiberEligible(
  territory: TerritoryProfile,
  selectedStrengths: AnalysisFact[],
): boolean {
  const fiber = territory.enrichment?.mobility?.connectivity?.fiberEligibleSharePercent;
  if (fiber == null) return false;
  if (fiber >= FIBER_OPPORTUNITY_THRESHOLD_PERCENT) return true;
  return (
    fiber >= 70 &&
    selectedStrengths.some((fact) => fact.theme === "connectivity")
  );
}

function isHousingOpportunityEligible(
  territory: TerritoryProfile,
  watchThemes: Set<AnalysisFactTheme>,
): boolean {
  const vacancy = territory.enrichment?.housing?.rpVacancyRatePercent;
  return (
    watchThemes.has("housing") ||
    (vacancy != null && qualifiesAsVacancyWatchPoint(vacancy, territory))
  );
}

function isQpvOpportunityEligible(
  territory: TerritoryProfile,
  watchThemes: Set<AnalysisFactTheme>,
): boolean {
  const urbanPolicy = territory.enrichment?.urbanPolicy;
  if (!urbanPolicy?.hasQpv || (urbanPolicy.qpvCount ?? 0) <= 0) {
    return false;
  }
  return watchThemes.has("policy_city") || urbanPolicy.hasQpv;
}

function isMobilityOpportunityEligible(territory: TerritoryProfile): boolean {
  const commute = territory.enrichment?.mobility?.commute;
  const profile = resolveComparisonProfile(territory);
  if (profile === "rural" || profile === "rural_isole") {
    return commute?.available === true;
  }
  return (
    commute?.available === true &&
    commute.publicTransportSharePercent != null &&
    commute.publicTransportSharePercent < 5
  );
}

function typologyOpportunityBoost(
  fact: AnalysisFact,
  typology: TerritoryTypology | null | undefined,
  profile: ComparisonProfile,
): number {
  if (!typology) return 0;

  const policy = typology.publicPolicyTypologies;
  let boost = 0;

  if (policy?.petitesVillesDeDemain || policy?.actionCoeurDeVille) {
    if (fact.theme === "housing" || fact.theme === "public_services") {
      boost += 2;
    }
  }

  if (policy?.franceRuralitesRevitalisation || policy?.villagesAvenir) {
    if (
      fact.theme === "connectivity" ||
      fact.theme === "public_services" ||
      fact.theme === "mobility"
    ) {
      boost += 2;
    }
  }

  if (profile === "metropole" || profile === "grande_ville") {
    if (fact.theme === "housing" || fact.theme === "mobility" || fact.theme === "policy_city") {
      boost += 1;
    }
  }

  if (profile === "rural" || profile === "rural_isole") {
    if (
      fact.theme === "connectivity" ||
      fact.theme === "mobility" ||
      fact.theme === "public_services"
    ) {
      boost += 1;
    }
  }

  return boost;
}

function isCandidateEligible(
  fact: AnalysisFact,
  context: OpportunitySelectionContext,
): boolean {
  if (fact.target !== "opportunities") return false;
  if (STUDY_ONLY_PATTERN.test(fact.sentence) || isStudyOnlyOpportunity(fact.sentence)) {
    return false;
  }

  const watchThemes = watchPointThemes(context.selectedWatchPoints);
  const { territory } = context;
  const relatedWatchPointThemes = alignedWatchThemes(fact, context.selectedWatchPoints);
  const relatedStrengthThemes = alignedStrengthThemes(fact, context.selectedStrengths);

  let themeEligible = true;

  switch (fact.theme) {
    case "housing":
      themeEligible = isHousingOpportunityEligible(territory, watchThemes);
      break;
    case "tourism":
      themeEligible = isTourismEligible(territory, context.selectedStrengths);
      if (
        themeEligible &&
        buildTerritoryContext(territory).requiresPerCapitaCaution === true
      ) {
        themeEligible =
          relatedWatchPointThemes.length > 0 || relatedStrengthThemes.length > 0;
      }
      break;
    case "ess_rge":
      themeEligible = isEssRgeEligible(territory, watchThemes, relatedWatchPointThemes);
      break;
    case "connectivity":
      themeEligible = isFiberEligible(territory, context.selectedStrengths);
      break;
    case "policy_city":
      themeEligible = isQpvOpportunityEligible(territory, watchThemes);
      break;
    case "mobility":
      themeEligible = isMobilityOpportunityEligible(territory);
      break;
    case "risks":
      themeEligible = watchThemes.has("risks");
      break;
    case "public_services":
      if (/France Services/i.test(fact.sentence)) {
        themeEligible = !isMechanicalContextOpportunity(
          fact,
          territory,
          buildTerritoryContext(territory),
          relatedWatchPointThemes,
        );
      }
      break;
    case "employment":
    case "security":
      themeEligible = watchThemes.has(fact.theme);
      break;
    default:
      themeEligible = true;
  }

  if (!themeEligible) {
    return false;
  }

  const territoryContext = buildTerritoryContext(territory);
  if (
    isMechanicalContextOpportunity(
      fact,
      territory,
      territoryContext,
      relatedWatchPointThemes,
    )
  ) {
    return false;
  }

  return isAcceptableOpportunity(fact, {
    territory,
    relatedWatchPointThemes,
    relatedStrengthThemes,
  });
}

function alignedWatchThemes(
  fact: AnalysisFact,
  selectedWatchPoints: AnalysisFact[],
): AnalysisFactTheme[] {
  const related: AnalysisFactTheme[] = [];
  const watchThemes = watchPointThemes(selectedWatchPoints);

  const alignment: Partial<Record<AnalysisFactTheme, AnalysisFactTheme[]>> = {
    housing: ["housing"],
    risks: ["risks"],
    ess_rge: ["employment", "housing", "income", "policy_city"],
    employment: ["employment"],
    security: ["security"],
    mobility: ["mobility"],
    policy_city: ["policy_city"],
    connectivity: ["connectivity"],
    tourism: ["tourism"],
    education: ["education", "health"],
    public_services: ["public_services"],
  };

  for (const theme of alignment[fact.theme] ?? []) {
    if (watchThemes.has(theme)) {
      related.push(theme);
    }
  }

  return related;
}

function alignedStrengthThemes(
  fact: AnalysisFact,
  selectedStrengths: AnalysisFact[],
): AnalysisFactTheme[] {
  const related: AnalysisFactTheme[] = [];
  const strengths = strengthThemes(selectedStrengths);

  const alignment: Partial<Record<AnalysisFactTheme, AnalysisFactTheme[]>> = {
    connectivity: ["connectivity"],
    tourism: ["tourism"],
    ess_rge: ["ess_rge", "economy", "employment_sectors"],
    education: ["education", "health", "equipments"],
    public_services: ["public_services"],
    mobility: ["mobility", "energy"],
  };

  for (const theme of alignment[fact.theme] ?? []) {
    if (strengths.has(theme)) {
      related.push(theme);
    }
  }

  return related;
}

function inferKind(
  relatedWatchPointThemes: AnalysisFactTheme[],
  relatedStrengthThemes: AnalysisFactTheme[],
): OpportunityKind {
  if (relatedWatchPointThemes.length > 0) {
    return "responds_to_watchpoint";
  }
  if (relatedStrengthThemes.length > 0) {
    return "leverages_strength";
  }
  return "strategic_context";
}

function scoreLevelsForFact(
  fact: AnalysisFact,
  context: OpportunitySelectionContext,
  relatedWatchPointThemes: AnalysisFactTheme[],
  relatedStrengthThemes: AnalysisFactTheme[],
): Pick<
  OpportunityCandidate,
  "actionability" | "evidenceStrength" | "localSpecificity" | "genericPenalty"
> {
  const { territory } = context;
  let actionability: OpportunityLevel = "medium";
  let evidenceStrength: OpportunityLevel = "medium";
  let localSpecificity: OpportunityLevel = "medium";
  let genericPenalty = 0;

  switch (fact.theme) {
    case "housing":
      actionability = "high";
      evidenceStrength = relatedWatchPointThemes.includes("housing") ? "high" : "medium";
      localSpecificity = "high";
      break;
    case "risks":
      actionability = "high";
      evidenceStrength = relatedWatchPointThemes.includes("risks") ? "high" : "medium";
      localSpecificity = "high";
      break;
    case "connectivity": {
      const fiber =
        territory.enrichment?.mobility?.connectivity?.fiberEligibleSharePercent ?? 0;
      actionability = fiber >= FIBER_OPPORTUNITY_THRESHOLD_PERCENT ? "medium" : "low";
      evidenceStrength = relatedStrengthThemes.includes("connectivity") ? "medium" : "low";
      localSpecificity = "low";
      genericPenalty = 3;
      if (!relatedStrengthThemes.includes("connectivity")) {
        genericPenalty += 2;
      }
      break;
    }
    case "tourism": {
      const territoryContext = buildTerritoryContext(territory);
      const hasTourismStrength = relatedStrengthThemes.includes("tourism");
      const signals = countTourismContextSignals(territory, hasTourismStrength);
      actionability = signals >= 2 || hasTourismStrength ? "medium" : "low";
      evidenceStrength =
        signals >= 3 || (hasTourismStrength && signals >= 1) ? "medium" : "low";
      localSpecificity = signals >= 2 || hasTourismStrength ? "medium" : "low";
      genericPenalty = signals >= 2 || hasTourismStrength ? 0 : 4;
      if (territoryContext.requiresPerCapitaCaution === true && !hasTourismStrength) {
        genericPenalty += 2;
      }
      if (/approfondir/i.test(fact.sentence)) {
        genericPenalty += 1;
      }
      break;
    }
    case "ess_rge": {
      const essCount = territory.enrichment?.enterprises?.essCount ?? 0;
      const rgeCount = territory.enrichment?.enterprises?.rgeCount ?? 0;
      actionability =
        essCount >= ESS_MIN_SIGNIFICANT_COUNT || rgeCount >= RGE_MIN_SIGNIFICANT_COUNT
          ? "medium"
          : "low";
      evidenceStrength =
        essCount >= ESS_MIN_SIGNIFICANT_COUNT || rgeCount >= RGE_MIN_SIGNIFICANT_COUNT
          ? "medium"
          : "low";
      localSpecificity =
        essCount >= ESS_MIN_SIGNIFICANT_COUNT || rgeCount >= RGE_MIN_SIGNIFICANT_COUNT
          ? "medium"
          : "low";
      genericPenalty =
        essCount >= ESS_MIN_SIGNIFICANT_COUNT || rgeCount >= RGE_MIN_SIGNIFICANT_COUNT
          ? 0
          : 4;
      if (relatedWatchPointThemes.length > 0) {
        genericPenalty = Math.max(0, genericPenalty - 2);
        actionability = "medium";
      }
      break;
    }
    case "mobility":
      actionability = "medium";
      evidenceStrength = "low";
      localSpecificity = "medium";
      genericPenalty = 2;
      break;
    case "policy_city":
      actionability = "high";
      evidenceStrength = relatedWatchPointThemes.includes("policy_city") ? "high" : "medium";
      localSpecificity = "high";
      break;
    case "employment": {
      const hasResources =
        (territory.enrichment?.enterprises?.essCount ?? 0) > 0 ||
        context.selectedStrengths.some((fact) =>
          ["ess_rge", "employment_sectors", "equipments", "economy"].includes(
            fact.theme,
          ),
        );
      actionability = hasResources ? "high" : "medium";
      evidenceStrength = relatedWatchPointThemes.includes("employment")
        ? hasResources
          ? "high"
          : "medium"
        : "medium";
      localSpecificity = hasResources ? "high" : "medium";
      break;
    }
    case "security":
      actionability = "medium";
      evidenceStrength = relatedWatchPointThemes.includes("security") ? "medium" : "low";
      localSpecificity = "medium";
      genericPenalty = 1;
      break;
    case "public_services":
      actionability = "medium";
      evidenceStrength = relatedStrengthThemes.includes("public_services") ? "medium" : "low";
      localSpecificity = "medium";
      break;
    case "education":
      actionability = "medium";
      evidenceStrength =
        relatedStrengthThemes.includes("education") || relatedStrengthThemes.includes("health")
          ? "medium"
          : "low";
      localSpecificity = "medium";
      genericPenalty = 1;
      break;
    default:
      break;
  }

  if (fact.confidence === "high") {
    evidenceStrength =
      evidenceStrength === "low" ? "medium" : evidenceStrength;
  }

  if (fact.year != null) {
    evidenceStrength =
      evidenceStrength === "low" ? "medium" : evidenceStrength;
  }

  return { actionability, evidenceStrength, localSpecificity, genericPenalty };
}

export function scoreOpportunityCandidate(
  candidate: Omit<OpportunityCandidate, "opportunityScore" | "redundancyPenalty" | "kind">,
): OpportunityCandidate {
  const issueAlignmentScore =
    candidate.relatedWatchPointThemes.length > 0
      ? Math.min(3, candidate.relatedWatchPointThemes.length + 1)
      : 0;

  const strengthAlignmentScore =
    candidate.relatedStrengthThemes.length > 0
      ? Math.min(2, candidate.relatedStrengthThemes.length + 1)
      : 0;

  const freshnessScore = candidate.fact.year != null ? 1 : 0;

  const opportunityScore =
    LEVEL_SCORE[candidate.actionability] +
    LEVEL_SCORE[candidate.evidenceStrength] +
    LEVEL_SCORE[candidate.localSpecificity] +
    issueAlignmentScore +
    strengthAlignmentScore +
    freshnessScore -
    candidate.genericPenalty;

  return {
    ...candidate,
    kind: inferKind(candidate.relatedWatchPointThemes, candidate.relatedStrengthThemes),
    redundancyPenalty: 0,
    opportunityScore,
  };
}

function applyTypologyBoost(
  candidate: OpportunityCandidate,
  context: OpportunitySelectionContext,
): OpportunityCandidate {
  const typology = context.territory.enrichment?.territoryTypology;
  const profile = resolveComparisonProfile(context.territory);
  const boost = typologyOpportunityBoost(candidate.fact, typology, profile);
  if (boost === 0) {
    return candidate;
  }
  return {
    ...candidate,
    opportunityScore: candidate.opportunityScore + boost,
  };
}

function buildSupplementalOpportunityFacts(
  context: OpportunitySelectionContext,
): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const watchThemes = watchPointThemes(context.selectedWatchPoints);
  const { territory } = context;

  if (
    watchThemes.has("employment") &&
    !context.allFacts.some(
      (fact) => fact.target === "opportunities" && fact.theme === "employment",
    ) &&
    qualifiesAsUnemploymentWatchPoint(
      territory.enrichment?.sociodemographics?.unemploymentRate,
    )
  ) {
    const hasResources =
      (territory.enrichment?.enterprises?.essCount ?? 0) > 0 ||
      context.selectedStrengths.some((fact) =>
        ["ess_rge", "employment_sectors", "equipments", "economy"].includes(fact.theme),
      );

    facts.push(
      createFact({
        theme: "employment",
        target: "opportunities",
        sentence:
          "Appuyer les actions d'insertion et d'accès à l'emploi sur les ressources économiques et associatives identifiées.",
        evidence: [
          `Taux de chômage : ${territory.enrichment?.sociodemographics?.unemploymentRate} %`,
        ],
        sourceKeys: ["insee-rp", "sirene"],
        year: territory.enrichment?.sociodemographics?.year,
        confidence: "medium",
        limitations: hasResources
          ? [
              "Piste d'action territoriale ; ne préjuge pas de dispositifs ni de financements.",
            ]
          : [
              "Piste d'action territoriale ; ne préjuge pas de dispositifs ni de financements.",
              "Ressources économiques ou associatives locales limitées dans les données disponibles.",
            ],
      }),
    );
  }

  return facts;
}

export function buildOpportunityCandidates(
  context: OpportunitySelectionContext,
): OpportunityCandidate[] {
  const supplemental = buildSupplementalOpportunityFacts(context);
  const rawFacts = [
    ...context.allFacts.filter((fact) => fact.target === "opportunities"),
    ...supplemental,
  ];

  const candidates: OpportunityCandidate[] = [];

  for (const fact of rawFacts) {
    if (!isCandidateEligible(fact, context)) continue;

    const relatedWatchPointThemes = alignedWatchThemes(
      fact,
      context.selectedWatchPoints,
    );
    const relatedStrengthThemes = alignedStrengthThemes(
      fact,
      context.selectedStrengths,
    );
    const levels = scoreLevelsForFact(
      fact,
      context,
      relatedWatchPointThemes,
      relatedStrengthThemes,
    );

    candidates.push(
      applyTypologyBoost(
        scoreOpportunityCandidate({
          fact,
          actionFamily: actionFamilyForFact(fact),
          relatedWatchPointThemes,
          relatedStrengthThemes,
          ...levels,
        }),
        context,
      ),
    );
  }

  return candidates;
}

function sharesOpportunityIndicator(a: AnalysisFact, b: AnalysisFact): boolean {
  const keysA = new Set(indicatorKeys(a));
  return indicatorKeys(b).some((key) => keysA.has(key));
}

export function dedupeOpportunityCandidates(
  candidates: OpportunityCandidate[],
): OpportunityCandidate[] {
  const kept: OpportunityCandidate[] = [];

  for (const candidate of candidates.sort(
    (a, b) => b.opportunityScore - a.opportunityScore,
  )) {
    const duplicate = kept.some((existing) => {
      if (existing.fact.theme === candidate.fact.theme) return true;
      if (existing.actionFamily === candidate.actionFamily) return true;
      if (existing.fact.id === candidate.fact.id) return true;
      if (sharesOpportunityIndicator(existing.fact, candidate.fact)) return true;
      if (areSemanticallySimilar(existing.fact, candidate.fact)) return true;
      return false;
    });

    if (!duplicate) {
      kept.push(candidate);
    }
  }

  return kept;
}

function canSelectOpportunity(
  candidate: OpportunityCandidate,
  selected: OpportunityCandidate[],
): boolean {
  if (candidate.opportunityScore < 0) return false;

  const lowSpecificityCount = selected.filter(
    (item) => item.localSpecificity === "low",
  ).length;
  if (candidate.localSpecificity === "low" && lowSpecificityCount >= 1) {
    return false;
  }

  const tourismCount = selected.filter((item) => item.fact.theme === "tourism").length;
  if (candidate.fact.theme === "tourism" && tourismCount >= 1) {
    return false;
  }

  const essCount = selected.filter((item) => item.fact.theme === "ess_rge").length;
  if (candidate.fact.theme === "ess_rge" && essCount >= 1) {
    return false;
  }

  const deepenCount = selected.filter((item) =>
    /approfondir/i.test(item.fact.sentence),
  ).length;
  if (/approfondir/i.test(candidate.fact.sentence) && deepenCount >= 1) {
    return false;
  }

  return !selected.some((existing) => {
    if (existing.fact.theme === candidate.fact.theme) return true;
    if (existing.actionFamily === candidate.actionFamily) return true;
    if (areSemanticallySimilar(existing.fact, candidate.fact)) return true;
    return false;
  });
}

function computeTargetCount(
  solid: OpportunityCandidate[],
  maxCount: number,
): number {
  if (solid.length <= MIN_OPPORTUNITY_COUNT) {
    return solid.length;
  }

  const highQualityCount = solid.filter(
    (candidate) => candidate.opportunityScore >= SOLID_OPPORTUNITY_MIN_SCORE + 1,
  ).length;
  const distinctThemes = new Set(solid.map((candidate) => candidate.fact.theme));

  if (
    highQualityCount >= MAX_OPPORTUNITY_COUNT &&
    distinctThemes.size >= MAX_OPPORTUNITY_COUNT &&
    maxCount >= MAX_OPPORTUNITY_COUNT
  ) {
    return MAX_OPPORTUNITY_COUNT;
  }

  return Math.min(DEFAULT_OPPORTUNITY_TARGET, maxCount);
}

export function selectOpportunities(
  candidates: OpportunityCandidate[],
): OpportunityCandidate[] {
  const deduped = dedupeOpportunityCandidates(candidates);
  const solid = deduped
    .filter((candidate) => candidate.opportunityScore >= SOLID_OPPORTUNITY_MIN_SCORE)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  if (solid.length === 0) {
    return [];
  }

  const maxCount = Math.min(MAX_OPPORTUNITY_COUNT, solid.length);
  const targetCount = computeTargetCount(solid, maxCount);
  const selected: OpportunityCandidate[] = [];

  const pick = (predicate: (candidate: OpportunityCandidate) => boolean) => {
    const candidate = solid.find(
      (item) =>
        predicate(item) &&
        !selected.some((existing) => existing.fact.id === item.fact.id) &&
        canSelectOpportunity(item, selected),
    );
    if (candidate) {
      selected.push(candidate);
    }
  };

  pick((item) => item.kind === "responds_to_watchpoint");
  pick((item) => item.kind === "leverages_strength");

  for (const candidate of solid) {
    if (selected.length >= targetCount || selected.length >= maxCount) break;
    if (selected.some((item) => item.fact.id === candidate.fact.id)) continue;
    if (!canSelectOpportunity(candidate, selected)) continue;
    selected.push(candidate);
  }

  if (selected.length < MIN_OPPORTUNITY_COUNT && solid.length >= MIN_OPPORTUNITY_COUNT) {
    for (const candidate of solid) {
      if (selected.length >= MIN_OPPORTUNITY_COUNT) break;
      if (selected.some((item) => item.fact.id === candidate.fact.id)) continue;
      if (!canSelectOpportunity(candidate, selected)) continue;
      selected.push(candidate);
    }
  }

  return selected.slice(0, maxCount);
}

export function selectOpportunityFacts(
  allFacts: AnalysisFact[],
  selectedStrengths: AnalysisFact[],
  selectedWatchPoints: AnalysisFact[],
  context: ScoreContext,
): AnalysisFact[] {
  const selectionContext: OpportunitySelectionContext = {
    territory: context.territory,
    allFacts,
    selectedStrengths,
    selectedWatchPoints,
  };

  const candidates = buildOpportunityCandidates(selectionContext);
  return selectOpportunities(candidates).map((candidate) => candidate.fact);
}

export function candidateFromFact(
  fact: AnalysisFact,
  context: OpportunitySelectionContext,
): OpportunityCandidate | null {
  if (!isCandidateEligible(fact, context)) {
    return null;
  }

  const relatedWatchPointThemes = alignedWatchThemes(
    fact,
    context.selectedWatchPoints,
  );
  const relatedStrengthThemes = alignedStrengthThemes(
    fact,
    context.selectedStrengths,
  );

  return scoreOpportunityCandidate({
    fact,
    actionFamily: actionFamilyForFact(fact),
    relatedWatchPointThemes,
    relatedStrengthThemes,
    ...scoreLevelsForFact(
      fact,
      context,
      relatedWatchPointThemes,
      relatedStrengthThemes,
    ),
  });
}
