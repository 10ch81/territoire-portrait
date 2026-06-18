export interface AgeBandInput {
  label: string;
  population: number;
  sharePercent: number | null;
}

export interface AgeAggregateSnapshot {
  part60_74: number | null;
  part75_89: number | null;
  part90Plus: number | null;
  part60Plus: number | null;
  reliable: boolean;
}

const BAND_MATCHERS = {
  part60_74: /60\s*[-–]\s*74/i,
  part75_89: /75\s*[-–]\s*89/i,
  part90Plus: /90\s*(?:ans)?\s*(?:ou\s*plus|\+)/i,
} as const;

export const AGE_AGGREGATE_ROUNDING_TOLERANCE = 0.15;

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function findBandShare(bands: AgeBandInput[], matcher: RegExp): number | null {
  const band = bands.find((item) => matcher.test(item.label));
  return band?.sharePercent ?? null;
}

export function computeAgeAggregates(bands: AgeBandInput[]): AgeAggregateSnapshot {
  const part60_74 = findBandShare(bands, BAND_MATCHERS.part60_74);
  const part75_89 = findBandShare(bands, BAND_MATCHERS.part75_89);
  const part90Plus = findBandShare(bands, BAND_MATCHERS.part90Plus);

  if (part60_74 === null || part75_89 === null || part90Plus === null) {
    return {
      part60_74,
      part75_89,
      part90Plus,
      part60Plus: null,
      reliable: false,
    };
  }

  return {
    part60_74,
    part75_89,
    part90Plus,
    part60Plus: roundOneDecimal(part60_74 + part75_89 + part90Plus),
    reliable: true,
  };
}

export function isAgeAggregateConsistent(snapshot: AgeAggregateSnapshot): boolean {
  if (!snapshot.reliable) {
    return true;
  }

  if (
    snapshot.part60_74 === null ||
    snapshot.part75_89 === null ||
    snapshot.part90Plus === null ||
    snapshot.part60Plus === null
  ) {
    return false;
  }

  const expected = roundOneDecimal(
    snapshot.part60_74 + snapshot.part75_89 + snapshot.part90Plus,
  );

  return Math.abs(expected - snapshot.part60Plus) <= AGE_AGGREGATE_ROUNDING_TOLERANCE;
}

export function parseFrenchPercentToken(token: string): number | null {
  const normalized = token.replace(",", ".").trim();
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatFrenchPercentOneDecimal(value: number): string {
  return value.toFixed(1).replace(".", ",");
}
