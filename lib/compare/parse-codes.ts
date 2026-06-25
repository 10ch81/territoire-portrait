const INSEE_CODE_PATTERN = /^(\d{5}|2[AB]\d{3})$/i;
export const MIN_COMPARE_COMMUNES = 2;
export const MAX_COMPARE_COMMUNES = 5;

export function isValidInseeCode(value: string): boolean {
  return INSEE_CODE_PATTERN.test(value.trim());
}

export function normalizeInseeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function parseCompareCodesParam(raw: string | string[] | undefined): string[] {
  const joined = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const seen = new Set<string>();
  const codes: string[] = [];

  for (const part of joined.split(/[,;\s]+/)) {
    const trimmed = part.trim();
    if (!trimmed || !isValidInseeCode(trimmed)) {
      continue;
    }
    const normalized = normalizeInseeCode(trimmed);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    codes.push(normalized);
    if (codes.length >= MAX_COMPARE_COMMUNES) {
      break;
    }
  }

  return codes;
}

export function buildCompareUrl(codes: string[]): string {
  const valid = codes.filter(isValidInseeCode).slice(0, MAX_COMPARE_COMMUNES);
  if (valid.length === 0) {
    return "/compare";
  }
  return `/compare?codes=${valid.map(normalizeInseeCode).join(",")}`;
}
