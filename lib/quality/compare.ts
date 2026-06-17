export const RELATIVE_WARNING_THRESHOLD = 5;
export const RELATIVE_CRITICAL_THRESHOLD = 50;
export const FACTOR_CRITICAL_THRESHOLD = 10;

export function computeRelativeDiffPercent(
  reference: number,
  actual: number,
): number {
  const base = Math.max(Math.abs(reference), Math.abs(actual), 1);
  return (Math.abs(reference - actual) / base) * 100;
}

export function computeFactor(reference: number, actual: number): number {
  if (reference === 0 && actual === 0) {
    return 1;
  }

  if (reference === 0 || actual === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(reference / actual, actual / reference);
}

export function severityFromNumericDiff(
  relativePercent: number,
  factor: number,
): "ok" | "warning" | "critical" {
  if (relativePercent <= RELATIVE_WARNING_THRESHOLD) {
    return "ok";
  }

  if (
    relativePercent > RELATIVE_CRITICAL_THRESHOLD ||
    factor >= FACTOR_CRITICAL_THRESHOLD
  ) {
    return "critical";
  }

  return "warning";
}

export function numbersMatch(
  reference: number,
  actual: number,
  tolerance = 0,
): boolean {
  return Math.abs(reference - actual) <= tolerance;
}
