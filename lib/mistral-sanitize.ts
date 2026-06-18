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
  hasDepartmentPropertyBenchmark: boolean;
  hasDepartmentSecurityBenchmark: boolean;
  hasAnyDepartmentBenchmark: boolean;
  hasEpciBenchmark: boolean;
  hasTourismFrequency: boolean;
  hasCommuteOutboundFlows: boolean;
  hasRealTransportOffer: boolean;
  hasMultiYearSecurity: boolean;
  hasMultiYearProperty: boolean;
  hasMultiYearPopulation: boolean;
  hasOnlyAggregatedDvf: boolean;
  hasRobustPropertyAnalysis: boolean;
  hasAdministrativeFunction: boolean;
  usesAavData: boolean;
  hasMixedCatNatTypes: boolean;
  aavCategoryLabel: string | null;
  bpeQualitativeSummary: string | null;
  bpeDomainCountsAreTypeCounts: boolean;
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
    id: "economy-side-ess-complementarity",
    pattern:
      /complémentarité entre (?:le )?SIDE et (?:les )?(?:ESS(?:\/RGE)?|RGE)(?:\s+avec\s+des\s+(?:ESS|RGE)\s+incluses?\s+dans\s+le\s+(?:stock\s+)?SIDE)?/gi,
    replacement:
      "SIDE décrit le tissu économique local ; en complément, les bases administratives ESS/RGE permettent d'identifier des acteurs ou thématiques spécifiques",
  },
  {
    id: "side-sirene-inclusion",
    pattern:
      /((?:données |comptages )?(?:ESS|RGE)[^.]{0,80}?(?:inclus(?:es)?|intégré(?:es)?|comptabilisé(?:es)?)[^.]{0,80}?(?:SIDE|total (?:SIDE|INSEE)))/gi,
    replacement:
      "en complément, les bases administratives identifient des structures ESS ou RGE distinctes du périmètre SIDE",
  },
  {
    id: "low-public-transit-dependency",
    pattern: /faible dépendance aux transports en commun/gi,
    replacement:
      "usage marginal des transports collectifs dans les déplacements domicile-travail",
  },
  {
    id: "department-indicators-comparison",
    pattern:
      /(?:supérieur|inférieur)(?:e|es)?\s+aux?\s+indicateurs\s+départementaux/gi,
    replacement: "à décrire sans comparaison départementale homogène fournie",
  },
  {
    id: "unemployment-department-comparison",
    pattern:
      /(?:chômage|taux de chômage)[^.]{0,50}(?:supérieur|inférieur)(?:e|es)?\s+(?:à la |aux? )?moyenne\s+départementale/gi,
    replacement: "taux de chômage élevé au recensement",
  },
  {
    id: "security-stakes",
    pattern: /enjeux sécuritaires/gi,
    replacement: "indicateurs de sécurité enregistrée à interpréter avec prudence",
  },
  {
    id: "security-problems",
    pattern: /problèmes sécuritaires/gi,
    replacement: "faits enregistrés par police/gendarmerie",
  },
  {
    id: "insecurity-wording",
    pattern: /\b(?:climat d['’])?insécurité\b/gi,
    replacement: "indicateurs de sécurité enregistrée à interpréter avec prudence",
  },
  {
    id: "security-tensions",
    pattern: /\btensions\b/gi,
    replacement: "indicateurs à suivre",
  },
  {
    id: "ess-mobilizable-actors",
    pattern: /acteurs mobilisables/gi,
    replacement:
      "acteurs potentiellement mobilisables, sous réserve d'une analyse locale plus fine",
  },
  {
    id: "ess-structured-sector",
    pattern: /filière ESS structurée/gi,
    replacement:
      "structures ESS identifiées dans les bases administratives, à confirmer localement",
  },
  {
    id: "real-estate-agencies-lever",
    pattern: /agences immobilières locales/gi,
    replacement:
      "acteurs du logement, les propriétaires, les collectivités et les dispositifs de réhabilitation",
  },
  {
    id: "real-estate-agencies-link",
    pattern: /en lien avec les agences immobilières/gi,
    replacement:
      "en lien avec les acteurs du logement, les propriétaires, les collectivités et les dispositifs de réhabilitation",
  },
  {
    id: "limited-public-transport-offer",
    pattern: /offre de transport collectif limitée/gi,
    replacement:
      "offre réelle de transport collectif non analysée dans les données disponibles",
  },
  {
    id: "limited-collective-transport",
    pattern: /transport collectif limité/gi,
    replacement:
      "équipements de transport recensés dans la BPE ; offre réelle de transport collectif non analysée",
  },
  {
    id: "entrepreneurial-fabric",
    pattern: /tissu entrepreneurial local/gi,
    replacement: "tissu économique local",
  },
  {
    id: "entrepreneurial-dynamism-generic",
    pattern: /dynamisme entrepreneurial/gi,
    replacement:
      "tissu économique local, à confirmer par des données de créations, d'évolution ou d'emploi",
  },
  {
    id: "infrastructure-accessibility-title",
    pattern: /accessibilité aux infrastructures/gi,
    replacement: "premiers équipements de mobilité recensés",
  },
  {
    id: "strong-territorial-accessibility",
    pattern: /accessibilité territoriale (?:forte|marquée|élevée)/gi,
    replacement:
      "équipements de mobilité recensés, sans preuve d'accessibilité territoriale globale",
  },
  {
    id: "real-estate-agencies-major-lever",
    pattern: /agences immobilières[^.]{0,40}levier/gi,
    replacement:
      "acteurs du logement, les propriétaires, les collectivités et les dispositifs de réhabilitation",
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
    when: (context) => !context.hasAnyDepartmentBenchmark,
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
  {
    id: "property-sustained-dynamics",
    pattern: /dynamique immobilière soutenue/gi,
    replacement: "données DVF agrégées à interpréter avec prudence",
    when: (context) => !context.hasRobustPropertyAnalysis,
  },
  {
    id: "property-stable-market",
    pattern: /marché stable/gi,
    replacement: "données DVF agrégées à interpréter avec prudence",
    when: (context) => !context.hasRobustPropertyAnalysis,
  },
  {
    id: "property-stable-prices",
    pattern: /prix moyens stables/gi,
    replacement: "données DVF agrégées à interpréter avec prudence",
    when: (context) => !context.hasRobustPropertyAnalysis,
  },
  {
    id: "property-active-market",
    pattern: /marché immobilier actif/gi,
    replacement: "mutations recensées sur l'année disponible",
    when: (context) => !context.hasRobustPropertyAnalysis,
  },
  {
    id: "property-active-market-short",
    pattern: /\bmarché actif\b/gi,
    replacement: "mutations recensées sur l'année disponible",
    when: (context) => !context.hasRobustPropertyAnalysis,
  },
  {
    id: "property-active-volume",
    pattern: /volume actif/gi,
    replacement: "volume de mutations recensé",
    when: (context) => !context.hasRobustPropertyAnalysis,
  },
  {
    id: "property-volume-resilience",
    pattern: /résilience des volumes/gi,
    replacement: "volume de mutations recensé",
    when: (context) => !context.hasRobustPropertyAnalysis,
  },
  {
    id: "below-department-average",
    pattern:
      /(?:inférieur|supérieur)(?:e|es)?\s+(?:à la |aux? )?moyenne\s+départementale/gi,
    replacement: "à décrire sans comparaison départementale homogène",
    when: (context) => !context.hasAnyDepartmentBenchmark,
  },
  {
    id: "below-regional-average",
    pattern:
      /(?:inférieur|supérieur)(?:e|es)?\s+(?:à la |aux? )?moyenne\s+régionale/gi,
    replacement: "à décrire sans comparaison régionale homogène",
    when: (context) => !context.hasRegionalBenchmark,
  },
  {
    id: "central-admin-function-without-data",
    pattern: /fonction (?:centrale )?administrative/gi,
    replacement: "centralité territoriale",
    when: (context) => !context.hasAdministrativeFunction,
  },
  {
    id: "central-admin-economic-function",
    pattern: /fonction centrale économique et administrative/gi,
    replacement: "fonction de centralité territoriale et économique",
    when: (context) => !context.hasAdministrativeFunction,
  },
  {
    id: "urban-area-vocabulary",
    pattern: /\baire urbaine\b/gi,
    replacement: "aire d'attraction des villes",
    when: (context) => context.usesAavData,
  },
  {
    id: "technical-aav-category-code",
    pattern: /catégorie\s+\d+/gi,
    replacement: "catégorie AAV",
    when: (context) => context.usesAavData,
  },
];

function countCatNatTypes(
  events: Array<{ label: string; startDate: string | null }>,
): { floodLike: number; other: number } {
  let floodLike = 0;
  let other = 0;

  for (const event of events) {
    const label = event.label.toLowerCase();
    if (
      label.includes("inond") ||
      label.includes("coulée") ||
      label.includes("coulee") ||
      label.includes("crue")
    ) {
      floodLike += 1;
      continue;
    }
    other += 1;
  }

  return { floodLike, other };
}

function buildFactsContext(facts: TerritorialFacts): FactsContext {
  const propertyYears = facts.immobilier?.serieHistorique?.length ?? 0;
  const populationYears = facts.evolutionDemographique?.length ?? 0;
  const catNatEvents = facts.risques?.catnat ?? [];
  const catNatTypes = countCatNatTypes(catNatEvents);
  const hasDepartmentPropertyBenchmark = facts.immobilier?.prixM2MoyenDepartement != null;
  const hasDepartmentSecurityBenchmark =
    facts.securite?.indicateurs.some(
      (indicator) => indicator.departmentRatePer1000 != null,
    ) ?? false;

  return {
    hasNationalBenchmark: false,
    hasRegionalBenchmark: false,
    hasDepartmentPropertyBenchmark,
    hasDepartmentSecurityBenchmark,
    hasAnyDepartmentBenchmark:
      hasDepartmentPropertyBenchmark || hasDepartmentSecurityBenchmark,
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
    hasRobustPropertyAnalysis: false,
    hasAdministrativeFunction: false,
    usesAavData: facts.geographie.aireAttraction != null,
    hasMixedCatNatTypes: catNatTypes.floodLike > 0 && catNatTypes.other > 0,
    aavCategoryLabel: facts.geographie.aireAttraction?.categoryLabel ?? null,
    bpeQualitativeSummary: facts.equipements?.resumeQualitatif ?? null,
    bpeDomainCountsAreTypeCounts:
      facts.equipements?.semantiqueDomaines.recomposeLeTotal === false,
  };
}

function sanitizeBpeMisleadingBreakdown(
  text: string,
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  const replacement =
    context.bpeQualitativeSummary ??
    "équipements recensés avec une diversité de services à interpréter prudemment";

  return text.replace(
    /\b\d+\s+équipements?\s*,?\s*dont\s+[^.;\n]+?\(\d+\)/gi,
    (match) => {
      warnings.push({
        field,
        index,
        original: match,
        sanitized: replacement,
        rule: "bpe-domain-equipment-breakdown",
      });
      return replacement;
    },
  );
}

function sanitizeCatNatInflation(
  text: string,
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  if (!context.hasMixedCatNatTypes) {
    return text;
  }

  return text.replace(/\b(\d+)\s+inondations?\b/gi, (match) => {
    const replacement =
      "plusieurs reconnaissances CATNAT, dont des épisodes d'inondations/coulées de boue";
    warnings.push({
      field,
      index,
      original: match,
      sanitized: replacement,
      rule: "catnat-mixed-types",
    });
    return replacement;
  });
}

function sanitizeAavCategoryLabel(
  text: string,
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  if (!context.aavCategoryLabel) {
    return text;
  }

  return text.replace(/catégorie AAV/gi, (match) => {
    warnings.push({
      field,
      index,
      original: match,
      sanitized: context.aavCategoryLabel!,
      rule: "aav-readable-category",
    });
    return context.aavCategoryLabel!;
  });
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

  sanitized = sanitizeCatNatInflation(sanitized, context, warnings, field, index);
  sanitized = sanitizeBpeMisleadingBreakdown(sanitized, context, warnings, field, index);
  sanitized = sanitizeAavCategoryLabel(sanitized, context, warnings, field, index);

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
    "dynamique immobilière soutenue",
    "résilience des volumes",
    "faible dépendance aux transports en commun",
    "complémentarité entre SIDE",
    "aire urbaine",
    "fonction centrale économique et administrative",
    "enjeux sécuritaires",
    "problèmes sécuritaires",
    "offre de transport collectif limitée",
    "acteurs mobilisables",
    "agences immobilières locales",
    "filière ess structurée",
    "prix moyens stables",
    "tissu entrepreneurial local",
    "accessibilité aux infrastructures",
    "marché immobilier actif",
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
