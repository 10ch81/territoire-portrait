import type { TerritorialFacts } from "./mistral-facts";
import type { TerritoryAnalysis } from "./types";
import {
  AGE_AGGREGATE_ROUNDING_TOLERANCE,
  formatFrenchPercentOneDecimal,
  parseFrenchPercentToken,
} from "./age-aggregates";
import {
  computePopulationGrowthFromHistory,
  formatFrenchSignedPercent,
  isAgeShareContext,
  isDemographicAgeCrossing,
  isDemographicEvolutionContext,
  parseSignedFrenchPercentToken,
  percentMatchesPopulationGrowth,
} from "./demographic-indicators";

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
  departmentName: string | null;
  hasDepartmentCentrality: boolean;
  territorialCentralityPhrase: string;
  ageAggregate60Plus: number | null;
  ageAggregate60PlusReliable: boolean;
  populationGrowthPercent: number | null;
  populationGrowthFromYear: number | null;
  populationGrowthToYear: number | null;
}

interface ReplacementRule {
  id: string;
  pattern: RegExp;
  replacement: string;
  when?: (context: FactsContext) => boolean;
}

const INTERNAL_LEAK_PATTERNS: RegExp[] = [
  /à décrire sans comparaison[^.;\n]*/gi,
  /à interpréter sans comparaison[^.;\n]*/gi,
  /comparaison homogène fournie/gi,
  /comparaison (?:nationale|régionale|départementale|EPCI) non fournie dans les données/gi,
  /sans comparaison (?:nationale|départementale|régionale) homogène(?: fournie)?/gi,
  /non analysée dans les données disponibles/gi,
  /non analysée dans les données/gi,
  /\bsanitizer\b/gi,
  /règle interne/gi,
];

export const INTERNAL_LEAK_MARKERS = [
  "à décrire sans comparaison",
  "comparaison homogène fournie",
  "comparaison nationale non fournie",
  "comparaison départementale non fournie",
  "sans comparaison nationale homogène",
  "sanitizer",
  "règle interne",
  "facts",
  "json",
] as const;

function getUnemploymentVintage(facts: TerritorialFacts): number {
  const note = facts.structureParAge?.note ?? "";
  const match = note.match(/20\d{2}/);
  return match ? Number.parseInt(match[0], 10) : 2021;
}

function unemploymentDescriptivePhrase(facts: TerritorialFacts, qualifier = "élevé"): string {
  const year = getUnemploymentVintage(facts);
  return `Taux de chômage des 15-64 ans ${qualifier} au recensement ${year}`;
}

export function containsInternalLeakage(text: string): string[] {
  const lower = text.toLowerCase();
  return INTERNAL_LEAK_MARKERS.filter((marker) => lower.includes(marker.toLowerCase()));
}

function cleanupSentenceArtifacts(text: string): string {
  return text
    .replace(/pôle de l['’]aire d'attraction/gi, "pôle d'une aire d'attraction")
    .replace(/,\s*disponibles\b(?=\s*[.!?]|$)/gi, "")
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/\s+,/g, ",")
    .replace(/,\s+(?=[.!?])/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[,;:]\s*/g, "")
    .replace(/\s*[,;:]\s*$/g, "")
    .trim();
}

function stripCrossThemeContamination(text: string): string {
  const lower = text.toLowerCase();
  const hasUnemployment = /\b(?:chômage|taux de chômage)\b/.test(lower);
  const hasSecurity = /\b(?:ssmsi|sécurité|police|gendarmerie|faits enregistrés)\b/.test(lower);

  if (hasUnemployment) {
    return text
      .replace(/[,;]\s+avec\s+un\s+taux\s+ssmsi[^.]*/gi, "")
      .replace(/[,;]?\s*taux\s+ssmsi[^.]*/gi, "")
      .replace(/[,;]?\s*pour\s+1000\s+habitants?[^.]*/gi, "")
      .replace(/[,;]?\s*(?:indicateurs?\s+de\s+sécurité|faits enregistrés)[^.]*/gi, "");
  }

  if (hasSecurity) {
    return text.replace(
      /[,;]?\s*(?:taux de chômage|chômage des 15-64|recensement 20\d{2})[^.]*/gi,
      "",
    );
  }

  return text;
}

function repairDegenerateSentences(
  text: string,
  facts: TerritorialFacts,
  context: FactsContext,
): string {
  const trimmed = text.trim();

  if (/^taux\s*[.,]?$/i.test(trimmed)) {
    return context.hasDepartmentSecurityBenchmark
      ? "Indicateurs de sécurité enregistrée à interpréter avec prudence"
      : "Indicateurs de sécurité enregistrée à interpréter selon la définition et le millésime disponibles";
  }

  if (/^(?:chômage|taux de chômage)\s*[.,]?$/i.test(trimmed)) {
    return unemploymentDescriptivePhrase(facts);
  }

  return text;
}

function finalizeUserFacingText(text: string): string {
  let result = text;

  for (const pattern of INTERNAL_LEAK_PATTERNS) {
    result = result.replace(pattern, "");
  }

  result = cleanupSentenceArtifacts(result);

  if (!result || /^[,.;\s]*$/.test(result)) {
    return "";
  }

  return result;
}

function sanitizeThemedComparisons(
  text: string,
  facts: TerritorialFacts,
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  let result = text;
  const unemploymentPhrase = unemploymentDescriptivePhrase(facts);

  const themedRules: Array<{ pattern: RegExp; replacement: string; rule: string }> = [
    {
      pattern:
        /taux de chômage[^.]{0,120}?(?:supérieur|inférieur|élevé|faible)(?:e|es)?[^.]{0,120}?(?:indicateurs départementaux|moyenne départementale|taux national|moyenne nationale)[^.]*/gi,
      replacement: unemploymentPhrase,
      rule: "unemployment-comparison-rewrite",
    },
    {
      pattern: /le taux de chômage est (?:inférieur|supérieur)(?:e)? au taux national\.?/gi,
      replacement: unemploymentDescriptivePhrase(facts, "modéré"),
      rule: "unemployment-national-rewrite",
    },
    {
      pattern:
        /(?:chômage|taux de chômage)[^.]{0,80}?à décrire sans comparaison[^.]*/gi,
      replacement: unemploymentPhrase,
      rule: "unemployment-leak-rewrite",
    },
    {
      pattern:
        /taux de chômage[^.]{0,40}?élevé[^.]{0,80}?(?:comparaison|homogène|départementale)[^.]*/gi,
      replacement: unemploymentPhrase,
      rule: "unemployment-elevated-leak-rewrite",
    },
  ];

  if (!context.hasDepartmentSecurityBenchmark) {
    themedRules.push(
      {
        pattern:
          /\btaux\s+(?:supérieur|inférieur)(?:e|es)?\s+aux?\s+indicateurs\s+départementaux\.?/gi,
        replacement:
          "Indicateurs de sécurité enregistrée à interpréter selon la définition et le millésime disponibles",
        rule: "security-dept-comparison-rewrite",
      },
      {
        pattern:
          /(?:indicateurs? de sécurité|sécurité|faits)[^.]{0,100}?(?:supérieur|inférieur)(?:e|es)?[^.]{0,80}?(?:indicateurs départementaux|département)[^.]*/gi,
        replacement:
          "Indicateurs de sécurité enregistrée à interpréter selon la définition et le millésime disponibles",
        rule: "security-comparison-rewrite",
      },
    );
  }

  for (const themedRule of themedRules) {
    result = result.replace(themedRule.pattern, (match) => {
      warnings.push({
        field,
        index,
        original: match,
        sanitized: themedRule.replacement,
        rule: themedRule.rule,
      });
      return themedRule.replacement;
    });
  }

  return result;
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
      /(?:,?\s*)?(?:supérieur|inférieur)(?:e|es)?\s+aux?\s+indicateurs\s+départementaux(?:\s+disponibles)?/gi,
    replacement: "",
    when: (context) => !context.hasDepartmentSecurityBenchmark,
  },
  {
    id: "unemployment-department-comparison",
    pattern:
      /(?:chômage|taux de chômage)[^.]{0,50}(?:supérieur|inférieur)(?:e|es)?\s+(?:à la |aux? )?moyenne\s+départementale/gi,
    replacement: "",
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
    id: "ess-collaborative-levers",
    pattern: /leviers potentiels pour des dynamiques collaboratives/gi,
    replacement: "ressources à examiner pour des projets locaux",
  },
  {
    id: "ess-collaborative-dynamics",
    pattern: /dynamiques collaboratives/gi,
    replacement: "projets locaux",
  },
  {
    id: "marked-local-economic-offer",
    pattern: /offre économique locale marquée/gi,
    replacement: "tissu économique local décrit par les données SIDE",
  },
  {
    id: "local-economic-offer",
    pattern: /offre économique locale/gi,
    replacement: "tissu économique local décrit par les données SIDE",
  },
  {
    id: "marked-local-economic-fabric",
    pattern: /tissu économique local marqué/gi,
    replacement:
      "tissu économique local structuré autour des unités légales et établissements actifs recensés par SIDE",
  },
  {
    id: "demographic-decline-dynamics",
    pattern: /dynamique démographique en déclin/gi,
    replacement: "recul démographique",
  },
  {
    id: "demographic-decline-abstract",
    pattern: /dynamique démographique négative/gi,
    replacement: "population en recul",
  },
  {
    id: "social-housing-absence",
    pattern: /absence de logements sociaux(?:\s*\(RPLS\))?/gi,
    replacement: "absence de parc locatif social recensé dans RPLS",
  },
  {
    id: "no-social-housing",
    pattern: /aucun logement social(?:\s*\(RPLS\))?/gi,
    replacement: "aucun logement locatif social recensé dans RPLS",
  },
  {
    id: "no-social-housing-parc",
    pattern: /absence de parc locatif social(?!\s+recensé)/gi,
    replacement: "absence de parc locatif social recensé dans RPLS",
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
    replacement: "équipements de mobilité recensés ; offre de transport collectif à approfondir",
  },
  {
    id: "limited-collective-transport",
    pattern: /transport collectif limité/gi,
    replacement:
      "équipements de transport recensés dans la BPE ; offre de transport collectif à approfondir",
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
    replacement: "équipements de mobilité recensés",
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
    replacement: "équipements de mobilité recensés ; offre de transport collectif à approfondir",
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
    replacement: "parts modales domicile-travail disponibles",
    when: (context) => !context.hasCommuteOutboundFlows,
  },
  {
    id: "commute-outbound-variant",
    pattern: /actifs travaillant hors commune/gi,
    replacement: "parts modales domicile-travail disponibles",
    when: (context) => !context.hasCommuteOutboundFlows,
  },
  {
    id: "national-average",
    pattern: /,?\s*(?:inférieur|supérieur)(?:e|es)?\s+(?:à la |au )?moyenne nationale/gi,
    replacement: "",
    when: (context) => !context.hasNationalBenchmark,
  },
  {
    id: "regional-average",
    pattern: /,?\s*(?:inférieur|supérieur)(?:e|es)?\s+(?:à la |aux? )?moyenne régionale/gi,
    replacement: "",
    when: (context) => !context.hasRegionalBenchmark,
  },
  {
    id: "department-average",
    pattern: /,?\s*(?:inférieur|supérieur)(?:e|es)?\s+(?:à la |aux? )?moyenne départementale/gi,
    replacement: "",
    when: (context) => !context.hasAnyDepartmentBenchmark,
  },
  {
    id: "epci-average",
    pattern: /,?\s*(?:inférieur|supérieur)(?:e|es)?\s+(?:à la |aux? )?moyenne (?:de l['’])?EPCI/gi,
    replacement: "",
    when: (context) => !context.hasEpciBenchmark,
  },
  {
    id: "national-average-phrase",
    pattern: /\bmoyenne nationale\b/gi,
    replacement: "",
    when: (context) => !context.hasNationalBenchmark,
  },
  {
    id: "regional-average-phrase",
    pattern: /\bmoyenne régionale\b/gi,
    replacement: "",
    when: (context) => !context.hasRegionalBenchmark,
  },
  {
    id: "department-average-phrase",
    pattern: /\bmoyenne départementale\b/gi,
    replacement: "",
    when: (context) => !context.hasAnyDepartmentBenchmark,
  },
  {
    id: "epci-average-phrase",
    pattern: /\bmoyenne (?:de l['’])?EPCI\b/gi,
    replacement: "",
    when: (context) => !context.hasEpciBenchmark,
  },
  {
    id: "national-unemployment",
    pattern: /(?:taux (?:de )?chômage|chômage) (?:national|BIT)/gi,
    replacement: "",
    when: (context) => !context.hasNationalBenchmark,
  },
  {
    id: "below-national-unemployment",
    pattern: /(?:inférieur|supérieur)(?:e)?(?:\s+\w+){0,4}\s+au\s+taux\s+national/gi,
    replacement: "",
    when: (context) => !context.hasNationalBenchmark,
  },
  {
    id: "versus-national-rate",
    pattern: /\bau taux national\b/gi,
    replacement: "",
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
      /(?:,?\s*)?(?:inférieur|supérieur)(?:e|es)?\s+(?:à la |aux? )?moyenne\s+départementale/gi,
    replacement: "",
    when: (context) => !context.hasAnyDepartmentBenchmark,
  },
  {
    id: "below-regional-average",
    pattern:
      /(?:,?\s*)?(?:inférieur|supérieur)(?:e|es)?\s+(?:à la |aux? )?moyenne\s+régionale/gi,
    replacement: "",
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeDemographicCrossing(
  text: string,
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  if (!isDemographicEvolutionContext(text) || context.populationGrowthPercent === null) {
    return text;
  }

  const evolutionWithPercent =
    /((?:recul démographique|baisse de population|population en recul|croissance(?:\s+démographique|\s+de la population)?)[^.]{0,120}?)\((-?\d+[,.]?\d*)\s*%([^)]*)\)/gi;

  let result = text.replace(
    evolutionWithPercent,
    (match, prefix: string, percentToken: string, suffix: string) => {
      const signed = parseSignedFrenchPercentToken(percentToken);

      if (signed === null) {
        return match;
      }

      if (percentMatchesPopulationGrowth(signed, context.populationGrowthPercent)) {
        return match;
      }

      if (
        !isDemographicAgeCrossing(
          signed,
          context.populationGrowthPercent,
          context.ageAggregate60PlusReliable ? context.ageAggregate60Plus : null,
        )
      ) {
        const growthPercent = context.populationGrowthPercent as number;
        const corrected = formatFrenchSignedPercent(growthPercent);
        const replacement = `${prefix}(${corrected}${suffix})`;
        warnings.push({
          field,
          index,
          original: match,
          sanitized: replacement,
          rule: "demographic-growth-percent-corrected",
        });
        return replacement;
      }

      const growthPercent = context.populationGrowthPercent as number;
      const correctedGrowth = formatFrenchSignedPercent(growthPercent);
      let replacement = `${prefix}(${correctedGrowth}${suffix})`;

      if (
        context.ageAggregate60PlusReliable &&
        context.ageAggregate60Plus !== null &&
        !isAgeShareContext(text)
      ) {
        const ageShare = formatFrenchPercentOneDecimal(context.ageAggregate60Plus);
        replacement += ` et part élevée des 60 ans et plus (${ageShare} %)`;
      }

      warnings.push({
        field,
        index,
        original: match,
        sanitized: replacement,
        rule: "demographic-age-crossing-rewrite",
      });
      return replacement;
    },
  );

  const evolutionWithoutParens =
    /((?:recul démographique|baisse de population|population en recul)[^.]{0,60}?)(-?\d+[,.]?\d*)\s*%/gi;

  result = result.replace(
    evolutionWithoutParens,
    (match, prefix: string, percentToken: string) => {
      if (prefix.trimEnd().endsWith("(") || isAgeShareContext(match)) {
        return match;
      }

      const signed = parseSignedFrenchPercentToken(percentToken);
      if (signed === null || context.populationGrowthPercent === null) {
        return match;
      }

      if (percentMatchesPopulationGrowth(signed, context.populationGrowthPercent)) {
        return match;
      }

      if (
        !isDemographicAgeCrossing(
          signed,
          context.populationGrowthPercent,
          context.ageAggregate60PlusReliable ? context.ageAggregate60Plus : null,
        )
      ) {
        return match;
      }

      const growthPercent = context.populationGrowthPercent as number;
      const correctedGrowth = formatFrenchSignedPercent(growthPercent);
      let replacement = `${prefix}${correctedGrowth}`;

      if (context.ageAggregate60PlusReliable && context.ageAggregate60Plus !== null) {
        const ageShare = formatFrenchPercentOneDecimal(context.ageAggregate60Plus);
        replacement += ` et part élevée des 60 ans et plus (${ageShare} %)`;
      }

      warnings.push({
        field,
        index,
        original: match,
        sanitized: replacement,
        rule: "demographic-age-crossing-inline-rewrite",
      });
      return replacement;
    },
  );

  return result;
}

const SECURITY_THEME_PATTERN =
  /\b(?:ssmsi|sécurité|police|gendarmerie|faits enregistrés|destructions?|violences?)\b/i;
const RISK_THEME_PATTERN =
  /\b(?:catnat|inondation|radon|géorisques?|risques? naturels?|coulées? de boue)\b/i;

function sanitizeSecurityRiskSeparation(
  text: string,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  const hasSecurity = SECURITY_THEME_PATTERN.test(text);
  const hasRisks = RISK_THEME_PATTERN.test(text);

  if (!hasSecurity || !hasRisks) {
    return text;
  }

  const clauses = text
    .split(/(?<=[.;])\s+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);

  const securityClauses = clauses.filter((clause) => SECURITY_THEME_PATTERN.test(clause));
  const riskClauses = clauses.filter(
    (clause) => RISK_THEME_PATTERN.test(clause) && !SECURITY_THEME_PATTERN.test(clause),
  );

  let replacement: string;

  if (securityClauses.length > 0 && riskClauses.length > 0) {
    replacement = `${securityClauses.join(" ")} ${riskClauses.join(" ")}`.replace(
      /\s+/g,
      " ",
    );
  } else {
    replacement =
      "Indicateurs de sécurité enregistrée à interpréter avec prudence. Exposition aux risques naturels, avec plusieurs reconnaissances CATNAT à prendre en compte.";
  }

  if (!replacement.endsWith(".")) {
    replacement += ".";
  }

  warnings.push({
    field,
    index,
    original: text,
    sanitized: replacement,
    rule: "security-risk-theme-separation",
  });

  return replacement;
}

function sanitizeDepartmentCentrality(
  text: string,
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  if (context.hasDepartmentCentrality || !context.departmentName) {
    return text;
  }

  const escapedDepartment = escapeRegExp(context.departmentName);
  const patterns = [
    new RegExp(`commune-centre de (?:l['’])?${escapedDepartment}`, "gi"),
    new RegExp(`commune-centre du ${escapedDepartment}`, "gi"),
    new RegExp(`commune-centre d['’]${escapedDepartment}`, "gi"),
    /commune-centre du département/gi,
    /commune-centre de (?:son |le |la |l['’])?département/gi,
    new RegExp(`chef-lieu de (?:l['’])?${escapedDepartment}`, "gi"),
    new RegExp(`chef-lieu du ${escapedDepartment}`, "gi"),
  ];

  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, (match) => {
      warnings.push({
        field,
        index,
        original: match,
        sanitized: context.territorialCentralityPhrase,
        rule: "department-centrality-rewrite",
      });
      return context.territorialCentralityPhrase;
    });
  }

  return result;
}

function replaceSixtyPlusPercent(
  match: string,
  percentToken: string,
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  const parsed = parseSignedFrenchPercentToken(percentToken);

  if (parsed === null) {
    return match;
  }

  if (percentMatchesPopulationGrowth(parsed, context.populationGrowthPercent)) {
    return match;
  }

  if (!context.ageAggregate60PlusReliable || context.ageAggregate60Plus === null) {
    const replacement = match
      .replace(/\d+[,.]?\d*\s*%/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    warnings.push({
      field,
      index,
      original: match,
      sanitized: replacement,
      rule: "age-aggregate-percent-removed",
    });
    return replacement;
  }

  if (Math.abs(parsed - context.ageAggregate60Plus) <= AGE_AGGREGATE_ROUNDING_TOLERANCE) {
    return match;
  }

  const corrected = formatFrenchPercentOneDecimal(context.ageAggregate60Plus);
  const replacement = match.replace(percentToken, corrected);
  warnings.push({
    field,
    index,
    original: match,
    sanitized: replacement,
    rule: "age-aggregate-percent-corrected",
  });
  return replacement;
}

function sanitizeAgeAggregateMentions(
  text: string,
  context: FactsContext,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  if (isDemographicEvolutionContext(text) && !isAgeShareContext(text)) {
    return text;
  }

  const patterns = [
    /(-?\d+[,.]?\d*)\s*%([^.;]{0,80}?60\s*ans\s*et\s*plus)/gi,
    /(60\s*ans\s*et\s*plus)([^.;]{0,80}?)(-?\d+[,.]?\d*)\s*%/gi,
  ];

  let result = text;

  result = result.replace(patterns[0], (match, percentToken: string) => {
    const parsed = parseSignedFrenchPercentToken(percentToken);
    if (
      parsed !== null &&
      percentMatchesPopulationGrowth(parsed, context.populationGrowthPercent)
    ) {
      return match;
    }

    return replaceSixtyPlusPercent(match, percentToken, context, warnings, field, index);
  });

  result = result.replace(
    patterns[1],
    (match, _label: string, _middle: string, percentToken: string) =>
      replaceSixtyPlusPercent(match, percentToken, context, warnings, field, index),
  );

  return result;
}

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
  const territorialCentralityPhrase =
    facts.geographie.centraliteTerritoriale?.qualificationRecommandee ??
    "commune-centre de son bassin territorial";
  const derivedGrowth = facts.indicateursDerives;
  const historyGrowth = computePopulationGrowthFromHistory(facts.evolutionDemographique);
  const populationGrowthPercent =
    derivedGrowth?.populationGrowthPercent ?? historyGrowth.percent;
  const populationGrowthFromYear =
    derivedGrowth?.populationGrowthFromYear ?? historyGrowth.fromYear;
  const populationGrowthToYear =
    derivedGrowth?.populationGrowthToYear ?? historyGrowth.toYear;

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
    departmentName: facts.departement?.name ?? null,
    hasDepartmentCentrality:
      facts.geographie.centraliteTerritoriale?.centraliteDepartementale ?? false,
    territorialCentralityPhrase,
    ageAggregate60Plus: facts.structureParAge?.aggregatsAge?.soixantePlus ?? null,
    ageAggregate60PlusReliable: facts.structureParAge?.aggregatsAge?.fiable ?? false,
    populationGrowthPercent,
    populationGrowthFromYear,
    populationGrowthToYear,
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
  facts: TerritorialFacts,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
  index?: number,
): string {
  let sanitized = sanitizeThemedComparisons(text, facts, context, warnings, field, index);

  sanitized = applyReplacementRules(
    sanitized,
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
  sanitized = sanitizeDepartmentCentrality(sanitized, context, warnings, field, index);
  sanitized = sanitizeDemographicCrossing(sanitized, context, warnings, field, index);
  sanitized = sanitizeAgeAggregateMentions(sanitized, context, warnings, field, index);
  sanitized = sanitizeSecurityRiskSeparation(sanitized, warnings, field, index);
  sanitized = stripCrossThemeContamination(sanitized);
  sanitized = repairDegenerateSentences(sanitized, facts, context);
  sanitized = finalizeUserFacingText(sanitized);

  return sanitized.trim();
}

function sanitizeStringList(
  items: string[],
  context: FactsContext,
  facts: TerritorialFacts,
  warnings: SanitizationWarning[],
  field: AnalysisTextField,
): string[] {
  return items
    .map((item, index) => sanitizeText(item, context, facts, warnings, field, index))
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
      summary: sanitizeText(normalized.summary, context, facts, warnings, "summary"),
      strengths: sanitizeStringList(normalized.strengths, context, facts, warnings, "strengths"),
      watchPoints: sanitizeStringList(
        normalized.watchPoints,
        context,
        facts,
        warnings,
        "watchPoints",
      ),
      opportunities: sanitizeStringList(
        normalized.opportunities,
        context,
        facts,
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
    "dynamisme entrepreneurial",
    "dynamique entrepreneuriale",
    "dynamique entrepreneuriale marquée",
    "tissu économique dynamique",
    "vitalité économique",
    "vitalité économique marquée",
    "potentiel touristique sous-exploité",
    "tensions sociales",
    "insécurité croissante",
    "tendance à la hausse",
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
    "prix stables",
    "prix moyens stables",
    "tissu entrepreneurial local",
    "accessibilité aux infrastructures",
    "marché immobilier actif",
    "offre économique locale marquée",
    "offre économique locale",
    "dynamique démographique en déclin",
    "leviers potentiels pour des dynamiques collaboratives",
    "absence de logements sociaux",
    "filière touristique",
    "développement de la filière",
    ...INTERNAL_LEAK_MARKERS,
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
