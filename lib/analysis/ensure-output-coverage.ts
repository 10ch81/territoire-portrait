import {
  formatFrenchPercentOneDecimal,
  parseFrenchPercentToken,
} from "../age-aggregates";
import {
  isDemographicEvolutionContext,
} from "../demographic-indicators";
import { ANALYSIS_OUTPUT_LIMITS, watchPointRetentionRank } from "./prompt-limits";
import { renderFactSentenceForOutput } from "./progressive-qualification";
import type { AnalysisFact, AnalysisFactTarget, AnalysisFactTheme } from "./types";

const COVERAGE_SENTENCE_OVERLAP = 0.32;

const THEME_COVERAGE_MATCHERS: Partial<
  Record<AnalysisFactTheme, (text: string) => boolean>
> = {
  demography: isDemographicEvolutionContext,
  ageing: (text) =>
    /\b(?:60 ans et plus|personnes \u00e2g\u00e9es|vieillissement)\b/i.test(text),
  employment: (text) => /\b(?:ch\u00f4mage|taux de ch\u00f4mage)\b/i.test(text),
  housing: (text) => /\b(?:logements vacants|vacance|logements)\b/i.test(text),
  security: (text) =>
    /\b(?:s\u00e9curit\u00e9 enregistr\u00e9e|SSMSI|d\u00e9linquance)\b/i.test(text),
  risks: (text) =>
    /\b(?:CATNAT|catastrophe naturelle|inondation|G\u00e9orisques)\b/i.test(text),
  employment_sectors: (text) => /\b(?:FLORES|postes salari\u00e9s)\b/i.test(text),
  connectivity: (text) => /\b(?:fibre|ARCEP|raccordables)\b/i.test(text),
  public_services: (text) => /\bFrance Services\b/i.test(text),
  economy: (text) =>
    /\b(?:SIDE|entreprises|\u00e9tablissements actifs)\b/i.test(text),
  ess_rge: (text) => /\b(?:ESS|RGE)\b/i.test(text),
  health: (text) => /\b(?:FINESS|sant\u00e9)\b/i.test(text),
  education: (text) =>
    /\b(?:scolaires|Annuaire \u00c9ducation)\b/i.test(text),
};

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

function bindingValueMatchesText(value: number, text: string, tolerance: number): boolean {
  const formatted = formatFrenchPercentOneDecimal(Math.abs(value));
  if (text.includes(formatted)) return true;

  const tokens = text.matchAll(/-?\d+[.,]\d+\s*(?:%|pour cent)/gi);
  for (const match of tokens) {
    const parsed = parseFrenchPercentToken(match[0]);
    if (parsed === null) continue;
    if (Math.abs(parsed - value) <= tolerance || Math.abs(Math.abs(parsed) - Math.abs(value)) <= tolerance) {
      return true;
    }
  }

  return false;
}

export function isSelectedFactCovered(fact: AnalysisFact, items: string[]): boolean {
  for (const item of items) {
    if (tokenOverlap(item, fact.sentence) >= COVERAGE_SENTENCE_OVERLAP) {
      return true;
    }
  }

  const themeMatcher = THEME_COVERAGE_MATCHERS[fact.theme];
  if (!themeMatcher) return false;

  for (const item of items) {
    if (!themeMatcher(item)) continue;

    const bindings = fact.numericBindings ?? [];
    if (bindings.length === 0) return true;

    for (const binding of bindings) {
      if (typeof binding.value !== "number") continue;
      const tolerance = fact.theme === "demography" ? 0.2 : 0.15;
      if (bindingValueMatchesText(binding.value, item, tolerance)) {
        return true;
      }
    }
  }

  return false;
}

function listPriorityRank(
  fact: AnalysisFact,
  field: "strengths" | "watchPoints",
  requiredFacts: AnalysisFact[],
): number {
  if (field === "watchPoints") {
    return watchPointRetentionRank(fact.theme);
  }
  const index = requiredFacts.findIndex((candidate) => candidate.id === fact.id);
  return index >= 0 ? index : requiredFacts.length + 10;
}

function factsCoveredByItem(
  item: string,
  requiredFacts: AnalysisFact[],
): AnalysisFact[] {
  return requiredFacts.filter((fact) => isSelectedFactCovered(fact, [item]));
}

function findReplaceableIndex(
  items: string[],
  missingFact: AnalysisFact,
  requiredFacts: AnalysisFact[],
  field: "strengths" | "watchPoints",
): number {
  let replaceIndex = -1;
  let replaceRank = -1;

  for (let index = 0; index < items.length; index += 1) {
    const covered = factsCoveredByItem(items[index], requiredFacts);
    const rank =
      covered.length === 0
        ? Number.MAX_SAFE_INTEGER
        : Math.max(...covered.map((fact) => listPriorityRank(fact, field, requiredFacts)));

    if (rank > replaceRank) {
      replaceRank = rank;
      replaceIndex = index;
    }
  }

  const missingRank = listPriorityRank(missingFact, field, requiredFacts);
  if (replaceIndex < 0) return -1;
  if (missingRank >= replaceRank && replaceRank < Number.MAX_SAFE_INTEGER) {
    return -1;
  }

  return replaceIndex;
}

function dedupeListItems(items: string[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    const duplicate = result.some(
      (existing) => tokenOverlap(existing, item) >= 0.72,
    );
    if (!duplicate) result.push(item);
  }
  return result;
}

function sortWatchPointsByPriority(
  items: string[],
  selectedFacts: AnalysisFact[],
): string[] {
  return [...items].sort((a, b) => {
    const themesA = selectedFacts.filter((fact) => isSelectedFactCovered(fact, [a]));
    const themesB = selectedFacts.filter((fact) => isSelectedFactCovered(fact, [b]));
    const rankA = Math.min(
      ...themesA.map((fact) => watchPointRetentionRank(fact.theme)),
      Number.MAX_SAFE_INTEGER,
    );
    const rankB = Math.min(
      ...themesB.map((fact) => watchPointRetentionRank(fact.theme)),
      Number.MAX_SAFE_INTEGER,
    );
    return rankA - rankB;
  });
}

export function ensureListCoverage(
  items: string[],
  field: "strengths" | "watchPoints",
  selectedFacts: AnalysisFact[],
  requiredFactsOverride?: AnalysisFact[],
): string[] {
  const max = ANALYSIS_OUTPUT_LIMITS[field].max;
  const requiredFacts =
    requiredFactsOverride ?? selectedFacts.filter((fact) => fact.target === field);
  if (requiredFacts.length === 0) return items.slice(0, max);

  const result = dedupeListItems(items.filter((item) => item.trim()));

  for (const fact of requiredFacts) {
    if (isSelectedFactCovered(fact, result)) continue;

    if (result.length < max) {
      result.push(renderFactSentenceForOutput(fact));
      continue;
    }

    const replaceIndex = findReplaceableIndex(result, fact, requiredFacts, field);
    if (replaceIndex >= 0) {
      result[replaceIndex] = renderFactSentenceForOutput(fact);
    }
  }

  const trimmed = result.slice(0, max);
  return field === "watchPoints"
    ? sortWatchPointsByPriority(trimmed, selectedFacts)
    : trimmed;
}

export function summaryHasDemographicGrowth(summary: string, fact: AnalysisFact): boolean {
  if (tokenOverlap(summary, fact.sentence) >= COVERAGE_SENTENCE_OVERLAP) {
    return true;
  }

  if (!isDemographicEvolutionContext(summary)) return false;

  const growthBinding = fact.numericBindings?.find((binding) =>
    binding.label.includes("\u00e9volution"),
  );
  if (!growthBinding || typeof growthBinding.value !== "number") {
    return isSelectedFactCovered(fact, [summary]);
  }

  return bindingValueMatchesText(growthBinding.value, summary, 0.2);
}

function extractGrowthClause(fact: AnalysisFact): string {
  const match = fact.sentence.match(/(recule|progresse)[^.]*\./i);
  if (match) {
    return match[0].replace(/\.$/, "").toLowerCase();
  }
  return fact.sentence.replace(/\.$/, "").toLowerCase();
}

function formatGrowthPhrase(fact: AnalysisFact): string | null {
  const binding = fact.numericBindings?.find((entry) =>
    entry.label.includes("\u00e9volution"),
  );
  if (!binding || typeof binding.value !== "number") return null;

  const years = fact.sentence.match(/entre (\d{4}) et (\d{4})/i);
  const formatted = formatFrenchPercentOneDecimal(Math.abs(binding.value));
  const signed =
    binding.value < 0
      ? `un recul de population de -${formatted} %`
      : `une progression de population de ${formatted} %`;

  if (years) {
    return `${signed} entre ${years[1]} et ${years[2]}`;
  }
  return signed;
}

export function ensureSummaryDemography(
  summary: string,
  selectedFacts: AnalysisFact[],
): string {
  const demographyFact =
    selectedFacts.find((fact) => fact.theme === "demography" && fact.target === "summary") ??
    selectedFacts.find((fact) => fact.theme === "demography" && fact.target === "watchPoints");

  if (!demographyFact) return summary;

  const trimmed = summary.trim();
  if (!trimmed) return demographyFact.sentence;
  if (summaryHasDemographicGrowth(trimmed, demographyFact)) return trimmed;

  const growthPhrase = formatGrowthPhrase(demographyFact) ?? extractGrowthClause(demographyFact);
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter((part) => part.trim());

  if (sentences.length >= 2) {
    const first = sentences[0].replace(/\s*;\s*$/, "").trim();
    let second = sentences[1].replace(/\.$/, "").trim();

    second = second
      .replace(
        /\bd[''](?:enjeux|d\u00e9fis) d\u00e9mographiques(?:\s+[^,.;]*)?/gi,
        growthPhrase.match(/^(un|une)\s/i) ? `d'${growthPhrase}` : growthPhrase,
      )
      .replace(
        /\b(?:avec\s+des?\s+)?(?:enjeux|d\u00e9fis) d\u00e9mographiques(?:\s+[^,.;]*)?/gi,
        `avec ${growthPhrase}`,
      )
      .replace(/\bd['']avec\b/gi, "d'")
      .replace(/\bavec\s+avec\b/gi, "avec")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;])/g, "$1")
      .trim();

    if (!isDemographicEvolutionContext(second)) {
      second = `${second.replace(/\.$/, "")}, avec ${growthPhrase}`;
    }

    return `${first.endsWith(".") ? first : `${first}.`} ${second.endsWith(".") ? second : `${second}.`}`;
  }

  return `${trimmed.replace(/\.$/, "")}, avec ${growthPhrase}.`;
}

function buildWatchPointRequirements(
  selectedFacts: AnalysisFact[],
  summary: string,
): AnalysisFact[] {
  const required = selectedFacts.filter((fact) => fact.target === "watchPoints");
  const demographyWatch = required.find((fact) => fact.theme === "demography");
  const demographySummary =
    selectedFacts.find((fact) => fact.theme === "demography" && fact.target === "summary") ??
    demographyWatch;

  if (
    demographyWatch &&
    demographySummary &&
    summaryHasDemographicGrowth(summary, demographySummary)
  ) {
    return required.filter((fact) => fact.id !== demographyWatch.id);
  }

  return required;
}

function snapListToSourceSentences(
  items: string[],
  selectedFacts: AnalysisFact[],
  field: "strengths" | "watchPoints" | "opportunities",
): string[] {
  return items.map((item) => {
    const sources = selectedFacts.filter(
      (fact) => fact.target === field && isSelectedFactCovered(fact, [item]),
    );
    if (sources.length === 0) return item;

    const best = [...sources].sort(
      (a, b) => tokenOverlap(item, b.sentence) - tokenOverlap(item, a.sentence),
    )[0]!;
    return renderFactSentenceForOutput(best);
  });
}

function backfillWatchPoints(
  items: string[],
  selectedFacts: AnalysisFact[],
  requiredFacts: AnalysisFact[],
  summary: string,
): string[] {
  const max = ANALYSIS_OUTPUT_LIMITS.watchPoints.max;
  const result = [...items];
  const demographyWatch = selectedFacts.find(
    (fact) => fact.theme === "demography" && fact.target === "watchPoints",
  );
  const demographySummary =
    selectedFacts.find((fact) => fact.theme === "demography" && fact.target === "summary") ??
    demographyWatch;
  const skipDemographyInSummary =
    demographyWatch &&
    demographySummary &&
    summaryHasDemographicGrowth(summary, demographySummary);

  const candidates = selectedFacts
    .filter((fact) => fact.target === "watchPoints")
    .sort(
      (a, b) => watchPointRetentionRank(a.theme) - watchPointRetentionRank(b.theme),
    );

  for (const fact of candidates) {
    if (result.length >= max) break;
    if (skipDemographyInSummary && fact.theme === "demography") continue;
    if (requiredFacts.some((required) => required.id === fact.id)) continue;
    if (isSelectedFactCovered(fact, result)) continue;
    result.push(renderFactSentenceForOutput(fact));
  }

  return result.slice(0, max);
}

export function normalizeOpportunityTone(
  items: string[],
  selectedFacts: AnalysisFact[],
): string[] {
  const opportunities = selectedFacts.filter((fact) => fact.target === "opportunities");

  return items.map((item) => {
    const matched = opportunities.find(
      (fact) => tokenOverlap(item, fact.sentence) >= 0.3,
    );
    if (matched && /\bpourrait\b/i.test(item)) {
      return renderFactSentenceForOutput(matched);
    }
    return item.replace(/\bpourrait\b/gi, "").replace(/\s{2,}/g, " ").trim();
  });
}

function ensureWatchPointsCoverage(
  items: string[],
  selectedFacts: AnalysisFact[],
  summary: string,
): string[] {
  const requiredFacts = buildWatchPointRequirements(selectedFacts, summary);
  const demographyWatch = selectedFacts.find(
    (fact) => fact.theme === "demography" && fact.target === "watchPoints",
  );
  const demographySummary =
    selectedFacts.find((fact) => fact.theme === "demography" && fact.target === "summary") ??
    demographyWatch;

  let filteredItems = items;
  if (
    demographyWatch &&
    demographySummary &&
    summaryHasDemographicGrowth(summary, demographySummary)
  ) {
    filteredItems = items.filter(
      (item) => !isSelectedFactCovered(demographyWatch, [item]),
    );
  }

  let result = ensureListCoverage(
    filteredItems,
    "watchPoints",
    selectedFacts,
    requiredFacts,
  );
  result = backfillWatchPoints(result, selectedFacts, requiredFacts, summary);
  return sortWatchPointsByPriority(
    snapListToSourceSentences(result, selectedFacts, "watchPoints"),
    selectedFacts,
  );
}

export function ensureOutputCoverage(
  output: {
    summary: string;
    strengths: string[];
    watchPoints: string[];
    opportunities?: string[];
  },
  selectedFacts: AnalysisFact[],
): {
  summary: string;
  strengths: string[];
  watchPoints: string[];
  opportunities: string[];
} {
  const summary = output.summary;

  return {
    summary,
    strengths: snapListToSourceSentences(
      ensureListCoverage(output.strengths, "strengths", selectedFacts),
      selectedFacts,
      "strengths",
    ),
    watchPoints: ensureWatchPointsCoverage(output.watchPoints, selectedFacts, summary),
    opportunities: normalizeOpportunityTone(
      snapListToSourceSentences(
        output.opportunities ?? [],
        selectedFacts,
        "opportunities",
      ),
      selectedFacts,
    ),
  };
}

export function countMissingCoverage(
  items: string[],
  field: AnalysisFactTarget,
  selectedFacts: AnalysisFact[],
): number {
  const required = selectedFacts.filter((fact) => fact.target === field);
  return required.filter((fact) => !isSelectedFactCovered(fact, items)).length;
}
