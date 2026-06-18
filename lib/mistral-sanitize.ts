import type { TerritorialFacts } from "./mistral-facts";
import type { TerritoryAnalysis } from "./types";

export type AnalysisTextField = "summary" | "strengths" | "watchPoints" | "opportunities";

export interface RawTerritorialAnalysis {
  summary: string;
  strengths: string[];
  watchPoints: string[];
  opportunities: string[];
}

export interface SanitizationWarning {
  field: AnalysisTextField;
  index?: number;
  original: string;
  sanitized: string;
  rule: string;
}

export interface SanitizationResult {
  analysis: RawTerritorialAnalysis;
  warnings: SanitizationWarning[];
}

interface FactsContext {
  hasNationalBenchmark: boolean;
  hasRegionalBenchmark: boolean;
  hasDepartmentBenchmark: boolean;
  hasEpciBenchmark: boolean;
  hasTourismFrequency: boolean;
  hasCommuteOutboundFlows: boolean;
  hasRealTransportOffer: boolean;
  hasMultiYearSecurity: boolean;
  hasMultiYearProperty: boolean;
  hasMultiYearPopulation: boolean;
  hasOnlyAggregatedDvf: boolean;
}

interface ReplacementRule {
  id: string;
  pattern: RegExp;
  replacement: string;
  when?: (context: FactsContext) => boolean;
}

const STATIC_REPLACEMENTS: ReplacementRule[] = [
  {
    id: "epci-chef-lieu",
    pattern: /chef[- ]lieu de l['’]EPCI/gi,
    replacement: "commune-centre de l'EPCI",
  },
  {
    id: "entrepreneurial-dynamism",
    pattern: /dynamique entrepreneuriale marquée/gi,
    replacement:
      "tissu économique local diversifié, à confirmer par des données d'évolution ou d'emploi",
  },
  {
    id: "economic-vitality",
    pattern: /vitalité économique marquée/gi,
    replacement: "présence d'un tissu économique local",
  },
  {
    id: "tourism-underexploited",
    pattern: /potentiel touristique sous[- ]exploité/gi,
    replacement: "potentiel touristique à approfondir",
  },
  {
    id: "social-tensions",
    pattern: /tensions sociales/gi,
    replacement: "fragilités à interpréter avec prudence",
  },
  {
    id: "rising-insecurity",
    pattern: /insécurité croissante/gi,
    replacement: "indicateurs de sécurité à interpréter avec prudence",
  },
  {
    id: "fiscal-pressure-low",
    pattern: /pression fiscale faible/gi,
    replacement: "taux communal à interpréter avec prudence",
  },
  {
    id: "fiscal-pressure-high",
    pattern: /pression fiscale forte/gi,
    replacement: "taux communal à interpréter avec prudence",
  },
  {
    id: "side-sirene-inclusion",
    pattern:
      /((?:données |comptages )?(?:ESS|RGE)[^.]{0,80}?(?:inclus(?:es)?|intégré(?:es)?|comptabilisé(?:es)?)[^.]{0,80}?(?:SIDE|total (?:SIDE|INSEE)))/gi,
    replacement:
      "en complément, les bases administratives identifient des structures ESS ou RGE distinctes du périmètre SIDE",
  },
];

const CONTEXTUAL_REPLACEMENTS: ReplacementRule[] = [
  {
    id: "trend-single-year",
    pattern: /tendance à la hausse/gi,
    replacement: "constat ponctuel sur l'année disponible",
    when: (context) =>
      !context.hasMultiYearSecurity &&
      !context.hasMultiYearProperty &&
      !context.hasMultiYearPopulation,
  },
  {
    id: "trend-generic",
    pattern: /\btendance\b/gi,
    replacement: "constat ponctuel",
    when: (context) =>
      !context.hasMultiYearSecurity &&
      !context.hasMultiYearProperty &&
      !context.hasMultiYearPopulation,
  },
  {
    id: "transport-offer-limited",
    pattern: /offre de transport limitée/gi,
    replacement:
      "offre réelle de transport collectif non analysée dans les données disponibles",
    when: (context) => !context.hasRealTransportOffer,
  },
  {
    id: "housing-accessibility",
    pattern: /accessibilité immobilière/gi,
    replacement: "prix immobiliers indicatifs issus de moyennes DVF agrégées",
    when: (context) => context.hasOnlyAggregatedDvf,
  },
  {
    id: "commute-outbound",
    pattern: /actifs travaillant hors de la commune/gi,
    replacement:
      "parts modales domicile-travail (sans flux sortants mesurés)",
    when: (context) => !context.hasCommuteOutboundFlows,
  },
  {
    id: "commute-outbound-variant",
    pattern: /actifs travaillant hors commune/gi,
    replacement:
      "parts modales domicile-travail (sans flux sortants mesurés)",
    when: (context) => !context.hasCommuteOutboundFlows,
  },
  {
    id: "national-average",
    pattern: /moyenne nationale/gi,
    replacement: "comparaison nationale non fournie dans les données",
    when: (context) => !context.hasNationalBenchmark,
  },
  {
    id: "regional-average",
    pattern: /moyenne régionale/gi,
    replacement: "comparaison régionale non fournie dans les données",
    when: (context) => !context.hasRegionalBenchmark,
  },
  {
    id: "department-average",
    pattern: /moyenne départementale/gi,
    replacement: "comparaison départementale non fournie dans les données",
    when: (context) => !context.hasDepartmentBenchmark,
  },
  {
    id: "epci-average",
    pattern: /moyenne (?:de l['’])?EPCI/gi,
    replacement: "comparaison EPCI non fournie dans les données",
    when: (context) => !context.hasEpciBenchmark,
  },
  {
    id: "national-unemployment",
    pattern: /(?:taux (?:de )?chômage|chômage) (?:national|BIT)/gi,
    replacement: "taux de chômage local (sans comparaison nationale homogène)",
    when: (context) => !context.hasNationalBenchmark,
  },
  {
    id: "below-national-unemployment",
    pattern: /(?:inférieur|supérieur)(?:e)?(?:\s+\w+){0,4}\s+au\s+taux\s+national/gi,
    replacement: "à interpréter sans comparaison nationale homogène",
    when: (context) => !context.hasNationalBenchmark,
  },
  {
    id: "versus-national-rate",
    pattern: /\bau taux national\b/gi,
    replacement: "sans comparaison nationale homogène fournie",
    when: (context) => !context.hasNationalBenchmark,
  },
  {
    id: "housing-accessibility-without-dvf",
    pattern: /accessibilité immobilière/gi,
    replacement: "données immobilières insuffisantes pour une conclusion d'accessibilité",
    when: (context) => !context.hasOnlyAggregatedDvf,
  },
];

function buildFactsContext(facts: TerritorialFacts): FactsContext {
  const propertyYears = facts.immobilier?.serieHistorique?.length ?? 0;
  const populationYears = facts.evolutionDemographique?.length ?? 0;

  return {
    hasNationalBenchmark: false,
    hasRegionalBenchmark: false,
    hasDepartmentBenchmark: facts.immobilier?.prixM2MoyenDepartement != null,
    hasEpciBenchmark:
      facts.geographie.comparatifEpci?.epciAveragePopulation != null ||
      facts.geographie.comparatifEpci?.epciAverageDensity != null,
    hasTourismFrequency: false,
    hasCommuteOutboundFlows: false,
    hasRealTransportOffer: false,
    hasMultiYearSecurity: false,
    hasMultiYearProperty: propertyYears >= 2,
    hasMultiYearPopulation: populationYears >= 2,
    hasOnlyAggregatedDvf: facts.immobilier != null,
  };
}

function applyReplacementRules(
  text: string,
  rules: ReplacementRule[],
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  let sanitized = text;

  for (const rule of rules) {
    if (rule.when && !rule.when(context)) {
      continue;
    }

    sanitized = sanitized.replace(rule.pattern, (match) => {
      warnings.push({
        field,
        index,
        original: match,
        sanitized: rule.replacement,
        rule: rule.id,
      });
      return rule.replacement;
    });
  }

  return sanitized;
}

function sanitizeText(
  text: string,
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  let sanitized = applyReplacementRules(
    text,
    STATIC_REPLACEMENTS,
    context,
    warnings,
    field,
    index,
  );

  sanitized = applyReplacementRules(
    sanitized,
    CONTEXTUAL_REPLACEMENTS,
    context,
    warnings,
    field,
    index,
  );

  return sanitized.trim();
}

function sanitizeStringList(
  items: string[],
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
): string[] {
  return items
    .map((item, index) => sanitizeText(item, context, warnings, field, index))
    .filter((item) => item.length > 0);
}

function normalizeRawAnalysis(
  analysis: Partial<RawTerritorialAnalysis>,
): RawTerritorialAnalysis {
  return {
    summary:
      typeof analysis.summary === "string" ? analysis.summary : "Analyse non disponible.",
    strengths: Array.isArray(analysis.strengths)
      ? analysis.strengths.filter((item): item is string => typeof item === "string")
      : [],
    watchPoints: Array.isArray(analysis.watchPoints)
      ? analysis.watchPoints.filter((item): item is string => typeof item === "string")
      : [],
    opportunities: Array.isArray(analysis.opportunities)
      ? analysis.opportunities.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function sanitizeTerritorialAnalysis(
  analysis: Partial<RawTerritorialAnalysis>,
  facts: TerritorialFacts,
): SanitizationResult {
  const normalized = normalizeRawAnalysis(analysis);
  const context = buildFactsContext(facts);
  const warnings: SanitizationWarning[] = [];

  return {
    analysis: {
      summary: sanitizeText(normalized.summary, context, warnings, "summary"),
      strengths: sanitizeStringList(normalized.strengths, context, warnings, "strengths"),
      watchPoints: sanitizeStringList(
        normalized.watchPoints,
        context,
        warnings,
        "watchPoints",
      ),
      opportunities: sanitizeStringList(
        normalized.opportunities,
        context,
        warnings,
        "opportunities",
      ),
    },
    warnings,
  };
}

export function containsForbiddenPhrases(text: string): string[] {
  const probes = [
    "chef-lieu de l'EPCI",
    "dynamique entrepreneuriale marquée",
    "vitalité économique marquée",
    "potentiel touristique sous-exploité",
    "tensions sociales",
    "insécurité croissante",
    "pression fiscale faible",
    "pression fiscale forte",
    "offre de transport limitée",
    "accessibilité immobilière",
    "moyenne nationale",
    "actifs travaillant hors de la commune",
  ];

  const lower = text.toLowerCase();
  return probes.filter((probe) => lower.includes(probe.toLowerCase()));
}

export function mergeSanitizedAnalysis(
  sanitized: RawTerritorialAnalysis,
  dataLimits: string[],
): TerritoryAnalysis {
  return {
    summary: sanitized.summary,
    strengths: sanitized.strengths,
    watchPoints: sanitized.watchPoints,
    opportunities: sanitized.opportunities,
    dataLimits,
  };
}
