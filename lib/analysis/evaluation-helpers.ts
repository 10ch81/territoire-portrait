import { computeDataLimits } from "../data-limits";
import type { TerritoryAnalysis, TerritoryProfile } from "../types";
import { mergeSanitizedAnalysis } from "../mistral-sanitize";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { buildCanonicalAnalysisOutput } from "./build-canonical-output";
import { isSelectedFactCovered } from "./ensure-output-coverage";
import { ANALYSIS_OUTPUT_LIMITS } from "./prompt-limits";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import type { AnalysisFact, AnalysisFactTheme } from "./types";
import { enforceFinalAnalysisInvariants } from "./enforce-final-invariants";
import { validateAnalysisOutput } from "./validate-output";

/** Reproduit la sortie finale serveur (sans appel Mistral : entrée = sortie canonique). */
export function buildFinalTerritorialAnalysis(territory: TerritoryProfile): {
  facts: AnalysisFact[];
  selectedFacts: AnalysisFact[];
  analysis: TerritoryAnalysis;
} {
  const facts = buildAnalysisFacts(territory);
  const selectedFacts = selectAnalysisFactsForPrompt(facts, territory);
  const canonical = buildCanonicalAnalysisOutput(territory, selectedFacts);
  const validated = validateAnalysisOutput(canonical, selectedFacts, territory);

  return {
    facts,
    selectedFacts,
    analysis: enforceFinalAnalysisInvariants(
      mergeSanitizedAnalysis(validated, computeDataLimits(territory)),
    ),
  };
}

const SUMMARY_THEME_SIGNALS: Array<{ theme: AnalysisFactTheme; pattern: RegExp }> = [
  {
    theme: "security",
    pattern: /\b(?:sécurité enregistrée|SSMSI|indicateurs de sécurité)\b/i,
  },
  {
    theme: "risks",
    pattern: /\b(?:CATNAT|catastrophe naturelle|risques naturels|inondation)\b/i,
  },
  {
    theme: "demography",
    pattern:
      /\b(?:croissance démographique|recul de population|progression de population|évolution démographique)\b/i,
  },
  {
    theme: "ageing",
    pattern: /\b(?:60 ans et plus|vieillissement)\b/i,
  },
  {
    theme: "housing",
    pattern: /\b(?:logements vacants|vacance|logement social|RPLS)\b/i,
  },
  {
    theme: "employment",
    pattern: /\b(?:chômage|taux de chômage)\b/i,
  },
  {
    theme: "finances",
    pattern: /\b(?:dette communale|endettement|OFGL)\b/i,
  },
  {
    theme: "tourism",
    pattern: /\b(?:hébergement touristique|capacité touristique|tourisme)\b/i,
  },
  {
    theme: "centrality",
    pattern: /\b(?:rang élevé|EPCI|centralité|aire d'attraction)\b/i,
  },
  {
    theme: "equipments",
    pattern: /\b(?:équipements recensés|BPE)\b/i,
  },
];

/** Thèmes détectés dans le résumé qui doivent être couverts par les faits sélectionnés. */
export function summaryThemesMissingFromSelectedFacts(
  summary: string,
  selectedFacts: AnalysisFact[],
): AnalysisFactTheme[] {
  const missing: AnalysisFactTheme[] = [];

  for (const { theme, pattern } of SUMMARY_THEME_SIGNALS) {
    if (!pattern.test(summary)) continue;

    const themeCovered = selectedFacts.some(
      (fact) => fact.theme === theme && isSelectedFactCovered(fact, [summary]),
    );

    if (!themeCovered) {
      missing.push(theme);
    }
  }

  return missing;
}

export function countSecurityIndicatorsAboveDepartment(
  territory: TerritoryProfile,
): number {
  const indicators = territory.enrichment?.security?.indicators ?? [];

  return indicators.filter(
    (indicator) =>
      indicator.departmentRatePer1000 !== null &&
      indicator.ratePer1000 !== null &&
      indicator.ratePer1000 > indicator.departmentRatePer1000,
  ).length;
}

export const GLOBAL_SECURITY_FORMULATION =
  /certains indicateurs de sécurité|les indicateurs de sécurité.*dépassent/i;

export const AGEING_WATCH_POINT_PATTERN =
  /\b(?:60 ans et plus|vieillissement de la population|population âgée)\b/i;

/** Ratio places d'hébergement / population résidente. */
export function tourismAccommodationRatio(territory: TerritoryProfile): number | null {
  const places = territory.enrichment?.tourism?.accommodationPlaces;
  const population = territory.population;

  if (places == null || population == null || population <= 0) {
    return null;
  }

  return places / population;
}

export const TOURISM_PER_CAPITA_RATIO_PATTERN =
  /\b(?:places?|hébergements?|capacit[ée]).{0,40}(?:par habitant|pour\s+100\s+habitants?|\/\s*hab)/i;

export const TOURISM_RATIO_PRUDENCE_PATTERN =
  /\b(?:prudence|fréquentation|population résidente|sans données de fréquentation|ne pas conclure|à interpréter)\b/i;

export const RGE_OPPORTUNITY_PATTERN = /\bRGE\b/i;

export const ESS_RGE_OPPORTUNITY_PATTERN =
  /mobiliser les acteurs ess et rge|acteurs ess et rge/i;

export { ANALYSIS_OUTPUT_LIMITS };
