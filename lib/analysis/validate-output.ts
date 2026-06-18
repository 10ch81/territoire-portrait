import {
  formatFrenchPercentOneDecimal,
  parseFrenchPercentToken,
} from "../age-aggregates";
import {
  isAgeShareContext,
  isDemographicAgeCrossing,
  isDemographicEvolutionContext,
  parseSignedFrenchPercentToken,
  percentMatchesPopulationGrowth,
  POPULATION_GROWTH_TOLERANCE,
} from "../demographic-indicators";
import { containsForbiddenPhrases, containsInternalLeakage } from "../mistral-sanitize";
import type { TerritoryAnalysis } from "../types";
import type {
  AnalysisFact,
  AnalysisFactTheme,
  RawTerritorialAnalysisOutput,
} from "./types";

const THEME_CONTEXT_KEYWORDS: Partial<
  Record<AnalysisFactTheme, (text: string) => boolean>
> = {
  demography: isDemographicEvolutionContext,
  ageing: isAgeShareContext,
  employment: (text) => /\b(?:chômage|taux de chômage)\b/i.test(text),
  housing: (text) => /\b(?:vacance|résidentielle)\b/i.test(text),
  connectivity: (text) => /\b(?:fibre|ARCEP|raccordables|internet)\b/i.test(text),
  mobility: (text) => /\b(?:voiture|domicile-travail|transports en commun)\b/i.test(text),
  health: (text) => /\b(?:FINESS|sanitaires|médico-social)\b/i.test(text),
  education: (text) => /\b(?:scolaires|Annuaire Éducation|scolarisation)\b/i.test(text),
  employment_sectors: (text) => /\b(?:FLORES|postes salariés|secteurs A17)\b/i.test(text),
  economy: (text) => /\b(?:SIDE|unités légales|établissements actifs)\b/i.test(text),
};

const CROSS_THEME_PATTERNS: Array<{ pattern: RegExp; rule: string }> = [
  {
    pattern: /\b(?:SSMSI|sécurité enregistrée|police|gendarmerie)\b.*\b(?:CATNAT|inondation|Géorisques)\b/i,
    rule: "security-risks-mix",
  },
  {
    pattern: /\b(?:CATNAT|inondation|Géorisques)\b.*\b(?:SSMSI|sécurité enregistrée)\b/i,
    rule: "risks-security-mix",
  },
  {
    pattern: /\b(?:unités légales|SIDE)\b.*\b(?:postes salariés|FLORES)\b(?![\s\S]{0,40}distinct)/i,
    rule: "side-flores-mix",
  },
  {
    pattern: /\b(?:fibre|ARCEP)\b.*\b(?:voiture|domicile-travail|IRVE)\b/i,
    rule: "connectivity-mobility-mix",
  },
  {
    pattern: /\b(?:FINESS|sanitaires)\b.*\b(?:accessibilité aux soins|desserte|proximité des soins)\b/i,
    rule: "health-access-inference",
  },
  {
    pattern: /\b(?:accessibilité aux soins|desserte|proximité des soins)\b.*\b(?:FINESS|sanitaires)\b/i,
    rule: "health-access-inference-reverse",
  },
  {
    pattern: /\btendance à la hausse\b/i,
    rule: "single-year-trend",
  },
  {
    pattern: /\babsence d['']écoles\b/i,
    rule: "education-absence",
  },
  {
    pattern: /\b(?:dynamisme sectoriel|tendance emploi|croissance sectorielle)\b.*\bFLORES\b/i,
    rule: "flores-trend",
  },
  {
    pattern: /\bfracture numérique\b/i,
    rule: "connectivity-fracture",
  },
  {
    pattern:
      /\b(?:risques naturels|CATNAT|inondation|Géorisques)\b.*\b(?:SSMSI|sécurité enregistrée|indicateurs de sécurité)\b/i,
    rule: "risks-security-mix-alt",
  },
  {
    pattern:
      /\b(?:SSMSI|sécurité enregistrée|indicateurs de sécurité)\b.*\b(?:risques naturels|CATNAT|inondation|Géorisques)\b/i,
    rule: "security-risks-mix-alt",
  },
  {
    pattern:
      /\b(?:hébergement touristique|capacité.*touristique|tourisme)\b.*\bFrance Services\b/i,
    rule: "tourism-public-services-mix",
  },
  {
    pattern:
      /\bFrance Services\b.*\b(?:hébergement touristique|capacité.*touristique|tourisme)\b/i,
    rule: "public-services-tourism-mix",
  },
  {
    pattern: /\bfilière touristique\b/i,
    rule: "tourism-filiere-overstatement",
  },
  {
    pattern: /\bdéveloppement de la filière\b/i,
    rule: "tourism-filiere-development",
  },
];

function extractPercentTokens(text: string): number[] {
  const tokens: number[] = [];
  const matches = text.matchAll(/-?\d+[.,]\d+\s*(?:%|pour cent)/gi);
  for (const match of matches) {
    const parsed = parseSignedFrenchPercentToken(match[0]);
    if (parsed !== null) tokens.push(parsed);
  }
  return tokens;
}

function getGrowthPercent(facts: AnalysisFact[]): number | null {
  const binding = facts
    .flatMap((f) => f.numericBindings ?? [])
    .find((b) => b.theme === "demography" && b.label.includes("évolution"));
  return typeof binding?.value === "number" ? binding.value : null;
}

function getAge60Plus(facts: AnalysisFact[]): number | null {
  const binding = facts
    .flatMap((f) => f.numericBindings ?? [])
    .find((b) => b.theme === "ageing" && b.label.includes("60"));
  return typeof binding?.value === "number" ? binding.value : null;
}

function isAllowedNumber(
  value: number,
  analysisFacts: AnalysisFact[],
  text: string,
): boolean {
  for (const fact of analysisFacts) {
    for (const binding of fact.numericBindings ?? []) {
      const bindingValue =
        typeof binding.value === "number"
          ? binding.value
          : parseFrenchPercentToken(String(binding.value));

      if (bindingValue === null) continue;

      const tolerance =
        binding.theme === "demography" ? POPULATION_GROWTH_TOLERANCE : 0.15;

      if (Math.abs(bindingValue - value) <= tolerance) {
        const contextMatcher = THEME_CONTEXT_KEYWORDS[binding.theme];
        if (!contextMatcher || contextMatcher(text)) {
          return true;
        }
      }

      if (Math.abs(Math.abs(bindingValue) - Math.abs(value)) <= tolerance) {
        const contextMatcher = THEME_CONTEXT_KEYWORDS[binding.theme];
        if (!contextMatcher || contextMatcher(text)) {
          return true;
        }
      }
    }
  }

  return false;
}

function validatePercentContext(text: string, analysisFacts: AnalysisFact[]): boolean {
  const percents = extractPercentTokens(text);
  const growth = getGrowthPercent(analysisFacts);
  const age60 = getAge60Plus(analysisFacts);

  for (const percent of percents) {
    if (isDemographicEvolutionContext(text)) {
      if (
        isDemographicAgeCrossing(percent, growth, age60) ||
        (growth !== null && !percentMatchesPopulationGrowth(percent, growth))
      ) {
        return false;
      }
    }

    if (isAgeShareContext(text) && age60 !== null) {
      const formatted = formatFrenchPercentOneDecimal(Math.abs(percent));
      const ageFormatted = formatFrenchPercentOneDecimal(age60);
      if (formatted !== ageFormatted && Math.abs(Math.abs(percent) - age60) > 0.15) {
        if (growth !== null && percentMatchesPopulationGrowth(percent, growth)) {
          return false;
        }
      }
    }

    if (!isAllowedNumber(percent, analysisFacts, text)) {
      return false;
    }
  }

  return true;
}

const OPPORTUNITY_STUDY_PATTERN =
  /^(?:faire|mener|conduire)\s+(?:une\s+)?(?:analyse|étude)|analyse plus poussée/i;

const FORBIDDEN_OPPORTUNITY_PATTERN =
  /(?:potentiel|dynamique).*(?:sous-exploité|à exploiter)|(?:sécurité|SSMSI).*(?:opportunité|levier)|filière touristique|développement de la filière/i;

function extractNumericTokens(text: string): number[] {
  const percents = extractPercentTokens(text);
  const integers: number[] = [];
  const intMatches = text.matchAll(/\b\d[\d\s]*\d\b/g);
  for (const match of intMatches) {
    const parsed = Number.parseInt(match[0].replace(/\s/g, ""), 10);
    if (!Number.isNaN(parsed)) integers.push(parsed);
  }
  return [...percents, ...integers];
}

function listHasDuplicateIndicator(items: string[]): boolean {
  const keys = new Set<string>();
  for (const item of items) {
    for (const value of extractNumericTokens(item)) {
      const key = `num:${value}`;
      if (keys.has(key)) return true;
      keys.add(key);
    }
  }
  return false;
}

function listHasSemanticDuplicate(items: string[]): boolean {
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const overlap = tokenOverlap(items[i], items[j]);
      if (overlap >= 0.72) return true;
    }
  }
  return false;
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3),
  );
  const tokensB = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3),
  );
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }
  return overlap / Math.min(tokensA.size, tokensB.size);
}

function listHasDuplicateTheme(items: string[], analysisFacts: AnalysisFact[]): boolean {
  const themes: string[] = [];
  for (const item of items) {
    const matched = analysisFacts.filter((fact) =>
      tokenOverlap(item, fact.sentence) >= 0.45,
    );
    for (const fact of matched) {
      if (themes.includes(fact.theme)) return true;
      themes.push(fact.theme);
    }
  }
  return false;
}

function hasValidationIssue(text: string, analysisFacts: AnalysisFact[]): string | null {
  if (!text.trim()) return "empty";

  if (containsForbiddenPhrases(text).length > 0) return "forbidden-phrase";
  if (containsInternalLeakage(text).length > 0) return "internal-leak";
  if (FORBIDDEN_OPPORTUNITY_PATTERN.test(text)) return "forbidden-opportunity";

  for (const { pattern } of CROSS_THEME_PATTERNS) {
    if (pattern.test(text)) return "cross-theme";
  }

  if (!validatePercentContext(text, analysisFacts)) return "numeric-context";

  return null;
}

function hasListValidationIssue(
  items: string[],
  field: "strengths" | "watchPoints" | "opportunities",
  analysisFacts: AnalysisFact[],
): boolean {
  if (listHasDuplicateIndicator(items)) return true;
  if (listHasSemanticDuplicate(items)) return true;
  if (field !== "strengths" && listHasDuplicateTheme(items, analysisFacts)) {
    return true;
  }
  return false;
}

function findReplacementFact(
  text: string,
  field: "summary" | "strengths" | "watchPoints" | "opportunities",
  analysisFacts: AnalysisFact[],
): AnalysisFact | null {
  const target =
    field === "summary"
      ? "summary"
      : field;

  const candidates = analysisFacts.filter((f) => f.target === target);
  if (candidates.length === 0) {
    return analysisFacts[0] ?? null;
  }

  const lower = text.toLowerCase();
  const themed = candidates.find((f) => lower.includes(f.theme.replace("_", " ")));
  return themed ?? candidates[0] ?? null;
}

function sanitizeField(
  text: string,
  field: "summary" | "strengths" | "watchPoints" | "opportunities",
  analysisFacts: AnalysisFact[],
): string {
  const issue = hasValidationIssue(text, analysisFacts);
  if (!issue) return text.trim();

  const replacement = findReplacementFact(text, field, analysisFacts);
  return replacement?.sentence ?? "";
}

function sanitizeList(
  items: string[],
  field: "strengths" | "watchPoints" | "opportunities",
  analysisFacts: AnalysisFact[],
): string[] {
  const result: string[] = [];
  const seenSentences = new Set<string>();
  const seenIndicators = new Set<string>();

  for (const item of items) {
    if (field === "opportunities") {
      if (OPPORTUNITY_STUDY_PATTERN.test(item.trim())) continue;
      if (FORBIDDEN_OPPORTUNITY_PATTERN.test(item)) continue;
    }

    const sanitized = sanitizeField(item, field, analysisFacts);
    if (!sanitized) continue;

    const sentenceKey = sanitized.toLowerCase();
    if (seenSentences.has(sentenceKey)) continue;

    const indicatorConflict = extractNumericTokens(sanitized).some((value) => {
      const key = `num:${value}`;
      if (seenIndicators.has(key)) return true;
      seenIndicators.add(key);
      return false;
    });
    if (indicatorConflict) continue;

    const semanticDuplicate = result.some(
      (existing) => tokenOverlap(existing, sanitized) >= 0.72,
    );
    if (semanticDuplicate) continue;

    seenSentences.add(sentenceKey);
    result.push(sanitized);
  }

  if (hasListValidationIssue(result, field, analysisFacts)) {
    const fallback = analysisFacts
      .filter((f) => f.target === field)
      .slice(0, field === "opportunities" ? 3 : 4)
      .map((f) => f.sentence);
    return fallback.filter((sentence, index, list) => list.indexOf(sentence) === index);
  }

  return result;
}

export function validateAnalysisOutput(
  analysis: RawTerritorialAnalysisOutput,
  analysisFacts: AnalysisFact[],
): Omit<TerritoryAnalysis, "dataLimits"> {
  const summaryRaw =
    typeof analysis.summary === "string" ? analysis.summary : "Analyse non disponible.";
  const summary = sanitizeField(summaryRaw, "summary", analysisFacts) || "Analyse non disponible.";

  return {
    summary,
    strengths: sanitizeList(
      Array.isArray(analysis.strengths)
        ? analysis.strengths.filter((i): i is string => typeof i === "string")
        : [],
      "strengths",
      analysisFacts,
    ),
    watchPoints: sanitizeList(
      Array.isArray(analysis.watchPoints)
        ? analysis.watchPoints.filter((i): i is string => typeof i === "string")
        : [],
      "watchPoints",
      analysisFacts,
    ),
    opportunities: sanitizeList(
      Array.isArray(analysis.opportunities)
        ? analysis.opportunities.filter((i): i is string => typeof i === "string")
        : [],
      "opportunities",
      analysisFacts,
    ),
  };
}

export function hasCriticalValidationIssue(
  text: string,
  analysisFacts: AnalysisFact[],
): boolean {
  return hasValidationIssue(text, analysisFacts) !== null;
}

// Exported for tests
export { extractPercentTokens, CROSS_THEME_PATTERNS };
