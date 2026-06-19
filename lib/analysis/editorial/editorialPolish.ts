import type { EditorialAnalysisOutput } from "../../types";
import type { EditorialProfileId } from "../../types";
import { joinFrenchList } from "../render-text";

export const EDITORIAL_OPPORTUNITY_MAX_LENGTH = 220;

const MECHANICAL_PRUDENCE_SUFFIX = / — Interprétation prudente/i;

function normalizeForCompare(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Convertit un fragment afterA (« à l'endettement… ») en complément après « portent sur ». */
export function issueLabelForSurPhrase(afterA: string): string {
  const trimmed = afterA.trim();
  if (/^au /i.test(trimmed)) {
    return `le ${trimmed.slice(3)}`;
  }
  if (/^aux /i.test(trimmed)) {
    return `les ${trimmed.slice(4)}`;
  }
  if (/^à la /i.test(trimmed)) {
    return `la ${trimmed.slice(4)}`;
  }
  if (/^à l'/i.test(trimmed)) {
    return trimmed.slice(2);
  }
  if (/^à le /i.test(trimmed)) {
    return `le ${trimmed.slice(4)}`;
  }
  if (/^à les /i.test(trimmed)) {
    return `les ${trimmed.slice(5)}`;
  }
  if (/^à /i.test(trimmed)) {
    return trimmed.slice(2);
  }
  return trimmed;
}

export function formatVigilanceOnIssues(issueAfterAItems: string[]): string {
  if (issueAfterAItems.length === 0) {
    return "";
  }
  const labels = issueAfterAItems.map(issueLabelForSurPhrase).filter(Boolean);
  return `Les principaux points de vigilance portent sur ${joinFrenchList(labels)}.`;
}

export function shouldAppendTypologyHint(opening: string, typology: string | null): boolean {
  if (!typology) {
    return false;
  }
  return !normalizeForCompare(opening).includes(normalizeForCompare(typology));
}

export function polishEditorialSummary(summary: string): string {
  let text = summary.replace(/\s+/g, " ").trim();

  const parenMatches = [...text.matchAll(/\(\s*([^()]+)\s*\)/g)];
  for (const match of parenMatches) {
    const inner = match[1] ?? "";
    const before = text.slice(0, match.index);
    if (normalizeForCompare(before).includes(normalizeForCompare(inner))) {
      text = text.replace(match[0], "");
    }
  }

  text = text.replace(/,\s*,/g, ",").replace(/\(\s*\)/g, "");
  text = text.replace(/,\s+et combine\s+un rang élevé dans son EPCI/gi, "");
  text = text.replace(/,\s+et combine\s+une croissance démographique soutenue/gi, "");
  text = text.replace(/,\s+et combine\s+une base d'emploi significative/gi, "");

  while (/, avec [^,]+, avec /i.test(text)) {
    text = text.replace(/, avec ([^,]+), avec /i, ", pour $1, complétée par ");
  }

  text = text.replace(/\)\.,/g, ").").replace(/\.\./g, ".").replace(/,\s*\./g, ".");
  text = text.replace(/\bportent à\b/gi, "portent sur");

  return text.trim();
}

export function dedupeEditorialOpportunities(
  opportunities: string[],
  profileId: EditorialProfileId,
): string[] {
  if (profileId !== "largeUrbanCenter" && profileId !== "socialFragilityUrban") {
    return opportunities;
  }

  const qpvMatches = opportunities.filter((item) => /quartiers prioritaires/i.test(item));
  if (qpvMatches.length <= 1) {
    return opportunities;
  }

  const preferred =
    opportunities.find((item) =>
      /articuler.*(?:insertion|emploi).*quartiers prioritaires/i.test(item),
    ) ?? qpvMatches[0];

  return opportunities.filter((item) => {
    if (!/quartiers prioritaires/i.test(item)) {
      return true;
    }
    return item === preferred;
  });
}

export function enforceOpportunityLength(
  opportunity: string,
  fallback: string,
  maxLength = EDITORIAL_OPPORTUNITY_MAX_LENGTH,
): string {
  const candidate = opportunity.replace(/\s+/g, " ").trim();
  if (candidate.length <= maxLength) {
    return candidate;
  }
  const trimmedFallback = fallback.trim();
  if (trimmedFallback.length > 0 && trimmedFallback.length <= maxLength) {
    return trimmedFallback;
  }
  return `${candidate.slice(0, maxLength - 1).trimEnd()}…`;
}

export function collectEditorialText(editorial: EditorialAnalysisOutput): string {
  return [
    editorial.summary,
    ...editorial.strengths,
    ...editorial.watchPoints,
    ...editorial.opportunities,
  ].join("\n");
}

export function findEditorialPolishViolations(editorial: EditorialAnalysisOutput): string[] {
  const text = collectEditorialText(editorial);
  const violations: string[] = [];

  if (/\bportent à\b/i.test(text)) {
    violations.push("contient « portent à »");
  }
  if (/\)\.,/.test(text)) {
    violations.push("contient « )., »");
  }
  if (/\.\./.test(text)) {
    violations.push("contient « .. »");
  }
  if (MECHANICAL_PRUDENCE_SUFFIX.test(text)) {
    violations.push("contient suffixe de prudence mécanique");
  }

  for (const opportunity of editorial.opportunities) {
    if (opportunity.length > EDITORIAL_OPPORTUNITY_MAX_LENGTH) {
      violations.push(`opportunité trop longue (${opportunity.length} car.)`);
    }
  }

  return violations;
}

export function applyEditorialPolish(
  editorial: EditorialAnalysisOutput,
  mvpOpportunities: string[] = [],
): EditorialAnalysisOutput {
  const lengthChecked = editorial.opportunities.map((item, index) =>
    enforceOpportunityLength(item, mvpOpportunities[index] ?? item),
  );

  return {
    ...editorial,
    summary: polishEditorialSummary(editorial.summary),
    opportunities: dedupeEditorialOpportunities(lengthChecked, editorial.profileId),
  };
}
