import type { AnalysisFact } from "./types";

const UNSOURCED_QUALIFIER_PATTERN =
  /\b(?:significati(?:f(?:s)?|ve(?:s)?)|diversifi(?:ée|é|ées|és)|structurant(?:e|s)?|marqu[ée](?:e|es|s)?|majeur(?:e|es|s)?|strat[ée]gique(?:s)?|prononc[ée](?:e|es|s)?)\b/i;

const UNSOURCED_GEO_ROLE_PATTERN =
  /\b(?:pôle structurant|au cœur de|au coeur de|coeur des|pyrénées|pyrenees)\b/i;

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

function phraseAllowedByFacts(text: string, analysisFacts: AnalysisFact[]): boolean {
  return analysisFacts.some(
    (fact) =>
      text.toLowerCase().includes(fact.sentence.toLowerCase().slice(0, 24)) ||
      tokenOverlap(text, fact.sentence) >= 0.4,
  );
}

export function hasUnsourcedQualifier(text: string, analysisFacts: AnalysisFact[]): boolean {
  if (!UNSOURCED_QUALIFIER_PATTERN.test(text)) return false;

  return !analysisFacts.some(
    (fact) =>
      UNSOURCED_QUALIFIER_PATTERN.test(fact.sentence) &&
      tokenOverlap(text, fact.sentence) >= 0.25,
  );
}

export function hasUnsourcedGeoRole(text: string, analysisFacts: AnalysisFact[]): boolean {
  if (/\bappartient à\b[^.]*\b(?:pyrénées|pyrenees)\b/i.test(text)) {
    return false;
  }
  if (/\b(?:CC|CA|CU|MET)\s+[\w-]*(?:pyrénées|pyrenees)/i.test(text)) {
    return false;
  }

  if (!UNSOURCED_GEO_ROLE_PATTERN.test(text)) return false;

  const centralityFacts = analysisFacts.filter((fact) => fact.theme === "centrality");
  if (
    centralityFacts.some(
      (fact) =>
        tokenOverlap(text, fact.sentence) >= 0.35 ||
        phraseAllowedByFacts(text, [fact]),
    )
  ) {
    return false;
  }

  return !analysisFacts.some(
    (fact) =>
      UNSOURCED_GEO_ROLE_PATTERN.test(fact.sentence) &&
      tokenOverlap(text, fact.sentence) >= 0.25,
  );
}

export function stripUnsourcedClaims(text: string, analysisFacts: AnalysisFact[]): string {
  let result = text.trim();
  if (!result) return result;

  const centralityFact = analysisFacts.find(
    (fact) => fact.theme === "centrality" && fact.target !== "watchPoints",
  );

  if (hasUnsourcedGeoRole(result, analysisFacts)) {
    if (centralityFact && /\bpôle structurant\b/i.test(result)) {
      result = result.replace(
        /[^.]*\bpôle structurant\b[^.]*/gi,
        centralityFact.sentence.replace(/\.$/, ""),
      );
    } else {
      result = result
        .replace(/,?\s*[^.,]*\bpôle structurant\b[^.,]*/gi, "")
        .replace(/,?\s*[^.,]*\bau cœur de[^.,]*/gi, "")
        .replace(/,?\s*[^.,]*\bau coeur de[^.,]*/gi, "")
        .replace(/,?\s*[^.,]*\bcoeur des[^.,]*/gi, "");
      if (!/\bappartient à\b/i.test(result)) {
        result = result
          .replace(/,?\s*[^.,]*\bpyrénées[^.,]*/gi, "")
          .replace(/,?\s*[^.,]*\bpyrenees[^.,]*/gi, "");
      }
    }
  }

  if (hasUnsourcedQualifier(result, analysisFacts)) {
    result = result.replace(
      /\b(?:significati(?:f(?:s)?|ve(?:s)?)|diversifi(?:ée|é|ées|és)|structurant(?:e|s)?|marqu[ée](?:e|es|s)?|majeur(?:e|es|s)?|strat[ée]gique(?:s)?|prononc[ée](?:e|es|s)?)\b/gi,
      "",
    );
  }

  return result
    .replace(/\s+et\s+(?=[,.]|$)/gi, "")
    .replace(/\s+et\s+([,.])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/\.\s*\./g, ".")
    .trim();
}

export function hasUnsourcedClaimIssue(text: string, analysisFacts: AnalysisFact[]): boolean {
  const stripped = stripUnsourcedClaims(text, analysisFacts);
  return (
    hasUnsourcedQualifier(stripped, analysisFacts) ||
    hasUnsourcedGeoRole(stripped, analysisFacts)
  );
}

export { UNSOURCED_GEO_ROLE_PATTERN, UNSOURCED_QUALIFIER_PATTERN };
