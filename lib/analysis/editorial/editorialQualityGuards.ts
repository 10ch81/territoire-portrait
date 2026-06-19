import type { EditorialAnalysisOutput } from "../../types";
import { ANALYSIS_OUTPUT_LIMITS } from "../prompt-limits";
import { hasForbiddenDerivedRatio } from "../verify-numeric-claims";
import type { AnalysisFact } from "../types";
import type { EditorialProfile } from "./editorialProfiles";

const INVENTORY_ONLY_PATTERN =
  /^(?:la commune compte|la commune dispose de|la commune recense)\b/i;

export function isInventoryOnlyStrength(text: string): boolean {
  const trimmed = text.trim();
  if (!INVENTORY_ONLY_PATTERN.test(trimmed)) {
    return false;
  }
  return !/\b(?:cohérent|significatif|dense|centralité|au regard|confirme|renforce)\b/i.test(
    trimmed,
  );
}

export function guardEditorialStrength(
  rendered: string,
  fallback: string,
  fact: AnalysisFact,
  profile: EditorialProfile,
): string {
  const candidate = rendered.trim() || fallback;

  if (hasForbiddenDerivedRatio(candidate, [fact])) {
    return fallback;
  }

  if (profile.bannedWeakStrengthPatterns.some((pattern) => pattern.test(candidate))) {
    return fallback;
  }

  if (isInventoryOnlyStrength(candidate)) {
    return fallback;
  }

  return candidate;
}

export function guardEditorialSummary(
  summary: string,
  mvpSummary: string,
  facts: AnalysisFact[] = [],
): string {
  const trimmed = summary.trim();
  if (!trimmed || hasForbiddenDerivedRatio(trimmed, facts)) {
    return mvpSummary;
  }
  return trimmed;
}

export function guardEditorialOpportunity(
  rendered: string | null,
  fallback: string,
  facts: AnalysisFact[] = [],
): string {
  const candidate = (rendered ?? fallback).trim();
  if (!candidate || hasForbiddenDerivedRatio(candidate, facts)) {
    return fallback;
  }
  return candidate;
}

export function enforceEditorialLimits(
  editorial: EditorialAnalysisOutput,
): EditorialAnalysisOutput {
  return {
    ...editorial,
    strengths: editorial.strengths.slice(0, ANALYSIS_OUTPUT_LIMITS.strengths.max),
    watchPoints: editorial.watchPoints.slice(0, ANALYSIS_OUTPUT_LIMITS.watchPoints.max),
    opportunities: editorial.opportunities.slice(
      0,
      ANALYSIS_OUTPUT_LIMITS.opportunities.max,
    ),
  };
}

export function applyEditorialQualityGuards(
  editorial: EditorialAnalysisOutput,
  mvpSummary: string,
  facts: AnalysisFact[] = [],
): EditorialAnalysisOutput {
  return enforceEditorialLimits({
    ...editorial,
    summary: guardEditorialSummary(editorial.summary, mvpSummary, facts),
  });
}
