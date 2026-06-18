import type { AnalysisFact } from "./types";

const DERIVED_RATIO_PATTERN =
  /\b(?:environ\s+)?(\d[\d\s]*(?:[.,]\d+)?)\s*postes?(?:\s+salariés)?\s*(?:pour|\/)\s*100\s*habitants\b/i;

function parseRatioCount(token: string): number | null {
  const normalized = token.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractDerivedRatioValue(text: string): number | null {
  const match = text.match(DERIVED_RATIO_PATTERN);
  if (!match?.[1]) return null;
  return parseRatioCount(match[1]);
}

function isAllowedDerivedRatio(value: number, analysisFacts: AnalysisFact[]): boolean {
  return analysisFacts.some((fact) =>
    (fact.numericBindings ?? []).some((binding) => {
      if (typeof binding.value !== "number") return false;
      if (!binding.label.includes("100 habitants")) return false;
      return Math.abs(binding.value - value) <= 1;
    }),
  );
}

export function hasForbiddenDerivedRatio(
  text: string,
  analysisFacts: AnalysisFact[],
): boolean {
  const ratioValue = extractDerivedRatioValue(text);
  if (ratioValue === null) {
    return false;
  }

  return !isAllowedDerivedRatio(ratioValue, analysisFacts);
}

export { DERIVED_RATIO_PATTERN };
