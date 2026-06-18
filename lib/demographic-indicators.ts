import {
  AGE_AGGREGATE_ROUNDING_TOLERANCE,
  formatFrenchPercentOneDecimal,
  parseFrenchPercentToken,
} from "./age-aggregates";

export const POPULATION_GROWTH_TOLERANCE = 0.15;

export interface PopulationGrowthSnapshot {
  percent: number | null;
  fromYear: number | null;
  toYear: number | null;
}

const DEMOGRAPHIC_EVOLUTION_CONTEXT =
  /recul démographique|baisse de population|population en recul|croissance(?:\s+démographique|\s+de la population)?|évolution démographique|entre\s+20\d{2}\s+et\s+20\d{2}|depuis\s+20\d{2}/i;

const AGE_SHARE_CONTEXT =
  /60\s*ans\s*et\s*plus|personnes?\s+âgées|vieillissement|population\s+âgée|seniors/i;

export function computePopulationGrowthFromHistory(
  history: Array<{ year: number; population: number }> | null | undefined,
): PopulationGrowthSnapshot {
  const firstPoint = history?.[0];
  const lastPoint = history?.at(-1);

  if (
    !firstPoint ||
    !lastPoint ||
    firstPoint.year === lastPoint.year ||
    firstPoint.population <= 0
  ) {
    return { percent: null, fromYear: null, toYear: null };
  }

  return {
    fromYear: firstPoint.year,
    toYear: lastPoint.year,
    percent:
      Math.round(
        ((lastPoint.population - firstPoint.population) / firstPoint.population) *
          1000,
      ) / 10,
  };
}

export function isDemographicEvolutionContext(text: string): boolean {
  return DEMOGRAPHIC_EVOLUTION_CONTEXT.test(text);
}

export function isAgeShareContext(text: string): boolean {
  return AGE_SHARE_CONTEXT.test(text);
}

export function parseSignedFrenchPercentToken(token: string): number | null {
  const trimmed = token.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const value = parseFrenchPercentToken(unsigned);

  if (value === null) {
    return null;
  }

  return negative ? -value : value;
}

export function formatFrenchSignedPercent(value: number): string {
  const formatted = formatFrenchPercentOneDecimal(Math.abs(value));
  return value < 0 ? `-${formatted} %` : `${formatted} %`;
}

export function percentMatchesPopulationGrowth(
  percent: number,
  growthPercent: number | null,
  tolerance = POPULATION_GROWTH_TOLERANCE,
): boolean {
  if (growthPercent === null) {
    return false;
  }

  return Math.abs(percent - growthPercent) <= tolerance;
}

export function percentMatchesAgeAggregate(
  percent: number,
  ageAggregate60Plus: number | null,
  tolerance = AGE_AGGREGATE_ROUNDING_TOLERANCE,
): boolean {
  if (ageAggregate60Plus === null) {
    return false;
  }

  return (
    Math.abs(percent - ageAggregate60Plus) <= tolerance ||
    Math.abs(Math.abs(percent) - ageAggregate60Plus) <= tolerance
  );
}

export function isDemographicAgeCrossing(
  percent: number,
  growthPercent: number | null,
  ageAggregate60Plus: number | null,
): boolean {
  return (
    percentMatchesAgeAggregate(percent, ageAggregate60Plus) &&
    !percentMatchesPopulationGrowth(percent, growthPercent)
  );
}
