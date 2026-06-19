import type { TerritoryProfile } from "../types";
import { buildTerritoryContext } from "./context/buildTerritoryContext";
import type { AnalysisFact, AnalysisFactTheme } from "./types";

/** Volume ESS considéré comme significatif pour mobilisation. */
export const ESS_MIN_SIGNIFICANT_COUNT = 40;

/** Seuil minimal RGE pour mobilisation comme levier prioritaire. */
export const RGE_MIN_SIGNIFICANT_COUNT = 10;

export type OpportunityQualityContext = {
  territory: TerritoryProfile;
  relatedWatchPointThemes?: AnalysisFactTheme[];
  relatedStrengthThemes?: AnalysisFactTheme[];
};

export type OpportunityQuality = {
  acceptable: boolean;
  isGeneric: boolean;
  lacksConcreteLever: boolean;
  isStudyOnly: boolean;
  weakEvidence: boolean;
  reasons: string[];
};

const STUDY_ONLY_PATTERN =
  /(?:faire|mener|conduire)\s+(?:une\s+)?(?:analyse|étude)|analyse plus poussée|potentiel touristique à approfondir,\s*faute de|approfondir le potentiel/i;

const GENERIC_OPPORTUNITY_PATTERNS: RegExp[] = [
  /renforcer l['']attractivit/i,
  /mobiliser les acteurs/i,
  /d[eé]velopper la fili[eè]re/i,
  /valoriser la couverture num[eé]rique.*attractivit/i,
  /s['']appuyer sur l['']offre.*attractivit/i,
  /mobiliser les acteurs ess et rge/i,
];

const CONCRETE_LEVER_PATTERNS: RegExp[] = [
  /r[eé]habiliter|requalifier/i,
  /parc vacant|logements vacants/i,
  /pr[eé]vention|adaptation aux risques/i,
  /risques naturels/i,
  /france services/i,
  /mobilit[eé] durable|recharge [eé]lectrique|covoiturage/i,
  /quartiers prioritaires|politique de la ville/i,
  /insertion|acc[eè]s à l['']emploi/i,
  /d[eé]marches administratives/i,
  /modes actifs|mutualisation/i,
  /h[eé]bergement touristique|capacit[eé] d'h[eé]bergement|accueil touristique/i,
];

const GENERIC_ESS_RGE_PATTERN = /mobiliser les acteurs ess et rge|acteurs ess et rge/i;

export function isStudyOnlyOpportunity(sentence: string): boolean {
  return STUDY_ONLY_PATTERN.test(sentence);
}

export function hasGenericOpportunityPhrasing(sentence: string): boolean {
  return GENERIC_OPPORTUNITY_PATTERNS.some((pattern) => pattern.test(sentence));
}

export function hasConcreteOpportunityLever(sentence: string): boolean {
  return CONCRETE_LEVER_PATTERNS.some((pattern) => pattern.test(sentence));
}

export function hasOpportunityTraceability(fact: AnalysisFact): boolean {
  return fact.sourceKeys.length > 0 && fact.evidence.length > 0;
}

function isWeakEssRgeMobilization(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  relatedWatchPointThemes: AnalysisFactTheme[],
): boolean {
  if (fact.theme !== "ess_rge" || !GENERIC_ESS_RGE_PATTERN.test(fact.sentence)) {
    return false;
  }

  const territoryContext = buildTerritoryContext(territory);
  if (territoryContext.isLargeCity === true || territoryContext.isDenseUrban === true) {
    return true;
  }

  const enterprises = territory.enrichment?.enterprises;
  const essCount = enterprises?.essCount ?? 0;
  const rgeCount = enterprises?.rgeCount ?? 0;

  if (rgeCount >= RGE_MIN_SIGNIFICANT_COUNT || essCount >= ESS_MIN_SIGNIFICANT_COUNT) {
    if (rgeCount < RGE_MIN_SIGNIFICANT_COUNT && relatedWatchPointThemes.length === 0) {
      return true;
    }
    return false;
  }

  return relatedWatchPointThemes.length === 0;
}

export function computeOpportunityQuality(
  fact: AnalysisFact,
  context: OpportunityQualityContext,
): OpportunityQuality {
  const reasons: string[] = [];
  const relatedWatchPointThemes = context.relatedWatchPointThemes ?? [];
  const relatedStrengthThemes = context.relatedStrengthThemes ?? [];

  const isStudyOnly = isStudyOnlyOpportunity(fact.sentence);
  if (isStudyOnly) {
    reasons.push("study_only");
  }

  if (fact.sourceKeys.length === 0) {
    reasons.push("missing_source_keys");
  }

  const weakEvidence = !hasOpportunityTraceability(fact);
  if (weakEvidence) {
    reasons.push("missing_evidence");
  }

  const lacksConcreteLever = !hasConcreteOpportunityLever(fact.sentence);
  if (lacksConcreteLever) {
    reasons.push("no_concrete_lever");
  }

  const genericPhrase = hasGenericOpportunityPhrasing(fact.sentence);
  const weakEssRge = isWeakEssRgeMobilization(
    fact,
    context.territory,
    relatedWatchPointThemes,
  );

  const anchoredToIssue =
    relatedWatchPointThemes.length > 0 || relatedStrengthThemes.length > 0;

  const territoryContext = buildTerritoryContext(context.territory);
  const tourismPerCapitaWithoutAnchor =
    fact.theme === "tourism" &&
    territoryContext.requiresPerCapitaCaution === true &&
    !anchoredToIssue;

  const isGeneric =
    isStudyOnly ||
    weakEssRge ||
    tourismPerCapitaWithoutAnchor ||
    (genericPhrase &&
      lacksConcreteLever &&
      !anchoredToIssue &&
      fact.confidence !== "high");

  if (isGeneric) {
    reasons.push("generic_formulation");
  }
  if (tourismPerCapitaWithoutAnchor) {
    reasons.push("tourism_per_capita_without_anchor");
  }

  const acceptable =
    !isStudyOnly &&
    fact.sourceKeys.length > 0 &&
    !weakEvidence &&
    !isGeneric &&
    (hasConcreteOpportunityLever(fact.sentence) || anchoredToIssue);

  return {
    acceptable,
    isGeneric,
    lacksConcreteLever,
    isStudyOnly,
    weakEvidence,
    reasons,
  };
}

export function isGenericOpportunity(
  fact: AnalysisFact,
  context: OpportunityQualityContext,
): boolean {
  return computeOpportunityQuality(fact, context).isGeneric;
}

export function isAcceptableOpportunity(
  fact: AnalysisFact,
  context: OpportunityQualityContext,
): boolean {
  return computeOpportunityQuality(fact, context).acceptable;
}

/** Contrôle minimal sans alignement watchPoint/strength (garde-fou canAddToTarget). */
export function isBaselineAcceptableOpportunity(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  return isAcceptableOpportunity(fact, { territory });
}
