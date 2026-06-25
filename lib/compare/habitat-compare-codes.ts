import {
  isValidInseeCode,
  MAX_COMPARE_COMMUNES,
  MIN_COMPARE_COMMUNES,
  normalizeInseeCode,
} from "./parse-codes";

export function buildHabitatCompareCodes(
  referenceInseeCode: string,
  comparableInseeCodes: string[],
): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];

  const push = (rawCode: string): void => {
    const normalized = normalizeInseeCode(rawCode);
    if (!isValidInseeCode(normalized) || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    codes.push(normalized);
  };

  push(referenceInseeCode);
  for (const code of comparableInseeCodes) {
    push(code);
    if (codes.length >= MAX_COMPARE_COMMUNES) {
      break;
    }
  }

  return codes;
}

export function hasMinimumHabitatCompareCodes(codes: string[]): boolean {
  return codes.length >= MIN_COMPARE_COMMUNES;
}
