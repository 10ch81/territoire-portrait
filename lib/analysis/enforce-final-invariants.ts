import {
  containsInternalLeakage,
  INTERNAL_LEAK_MARKERS,
} from "../mistral-sanitize";
import type { TerritoryAnalysis } from "../types";
import { ANALYSIS_OUTPUT_LIMITS } from "./prompt-limits";

const FINAL_INTERNAL_LEAK_TERMS = [
  "analysisfacts",
  "numericbindings",
  "rawfacts",
  "sanitize",
  "sanitizer",
  "facts",
  "fact",
  "json",
] as const;

type AnalysisListField = "strengths" | "watchPoints" | "opportunities";

function finalLeakPattern(term: string, global: boolean): RegExp {
  return new RegExp(`\\b${term}\\b`, global ? "gi" : "i");
}

function normalizeItem(text: string): string {
  return text.trim();
}

export function hasFinalInternalLeakage(text: string): boolean {
  if (containsInternalLeakage(text).length > 0) {
    return true;
  }

  return FINAL_INTERNAL_LEAK_TERMS.some((term) =>
    finalLeakPattern(term, false).test(text),
  );
}

export function stripFinalInternalLeakage(text: string): string {
  let result = text;

  for (const term of FINAL_INTERNAL_LEAK_TERMS) {
    result = result.replace(finalLeakPattern(term, true), "");
  }

  for (const marker of INTERNAL_LEAK_MARKERS) {
    result = result.replace(new RegExp(escapeRegExp(marker), "gi"), "");
  }

  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeSummaryText(text: string): string {
  return stripFinalInternalLeakage(text).trim();
}

function sanitizeListItem(text: string): string {
  if (hasFinalInternalLeakage(text)) {
    return "";
  }

  const normalized = normalizeItem(text);
  return normalized.length > 0 ? normalized : "";
}

function dedupeExactItems(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const key = normalizeItem(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }

  return result;
}

function enforceListField(
  items: string[],
  field: AnalysisListField,
): string[] {
  const max = ANALYSIS_OUTPUT_LIMITS[field].max;
  const sanitized = items
    .map((item) => sanitizeListItem(item))
    .filter((item) => item.length > 0);

  return dedupeExactItems(sanitized).slice(0, max);
}

/**
 * Dernière barrière avant exposition utilisateur / API.
 * S'applique après validateAnalysisOutput, ensureOutputCoverage et polishRenderedSentence.
 */
export function enforceFinalAnalysisInvariants(
  analysis: TerritoryAnalysis,
): TerritoryAnalysis {
  const summary = sanitizeSummaryText(analysis.summary);

  const result: TerritoryAnalysis = {
    summary,
    strengths: enforceListField(analysis.strengths, "strengths"),
    watchPoints: enforceListField(analysis.watchPoints, "watchPoints"),
    opportunities: enforceListField(analysis.opportunities, "opportunities"),
    dataLimits: [...analysis.dataLimits],
  };

  if (analysis.editorial) {
    result.editorial = {
      ...analysis.editorial,
      summary: sanitizeSummaryText(analysis.editorial.summary),
      strengths: enforceListField(analysis.editorial.strengths, "strengths"),
      watchPoints: enforceListField(analysis.editorial.watchPoints, "watchPoints"),
      opportunities: enforceListField(analysis.editorial.opportunities, "opportunities"),
    };
  }

  return result;
}
