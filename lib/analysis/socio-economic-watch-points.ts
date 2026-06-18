import type { TerritoryProfile } from "../types";
import type { AnalysisFact } from "./types";
import { formatEuro } from "./format";

/** Seuil RP INSEE : taux de chômage 15-64 au-delà duquel un point d'attention est justifié. */
export const UNEMPLOYMENT_WATCH_POINT_THRESHOLD_PERCENT = 10;

/** Dette par habitant OFGL au-delà de laquelle un point d'attention est justifié (€). */
export const DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR = 1_200;

/** Revenu médian FILOSOFI en dessous duquel un point d'attention est justifié (€). */
export const MEDIAN_INCOME_LOW_WATCH_POINT_THRESHOLD_EUR = 17_000;

/** Revenu médian modéré — éligible au score composite de fragilité (€). */
export const MEDIAN_INCOME_MODERATE_WATCH_POINT_THRESHOLD_EUR = 19_000;

/** Vacance résidentielle élevée pour le score composite de fragilité (%). */
export const VACANCY_FRAGILITY_THRESHOLD_PERCENT = 10;

const DESCRIPTIVE_INCOME_SENTENCE_PATTERN =
  /Le revenu médian des ménages s'élève à/i;

export function qualifiesAsUnemploymentWatchPoint(
  unemploymentRate: number | null | undefined,
): boolean {
  if (unemploymentRate === null || unemploymentRate === undefined) {
    return false;
  }
  return unemploymentRate >= UNEMPLOYMENT_WATCH_POINT_THRESHOLD_PERCENT;
}

export function qualifiesAsDebtWatchPoint(
  debtPerCapitaEur: number | null | undefined,
): boolean {
  if (debtPerCapitaEur === null || debtPerCapitaEur === undefined) {
    return false;
  }
  return debtPerCapitaEur >= DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR;
}

export function qualifiesAsLowMedianIncomeForWatchPoint(
  medianIncomeEur: number | null | undefined,
): boolean {
  if (medianIncomeEur === null || medianIncomeEur === undefined) {
    return false;
  }
  return medianIncomeEur < MEDIAN_INCOME_LOW_WATCH_POINT_THRESHOLD_EUR;
}

function hasModerateMedianIncomeForComposite(
  medianIncomeEur: number | null | undefined,
): boolean {
  if (medianIncomeEur === null || medianIncomeEur === undefined) {
    return false;
  }
  return medianIncomeEur < MEDIAN_INCOME_MODERATE_WATCH_POINT_THRESHOLD_EUR;
}

function hasUnfavorableIncomeComparison(territory: TerritoryProfile): boolean {
  const income = territory.enrichment?.sociodemographics?.medianDisposableIncome;
  const reference =
    territory.enrichment?.sociodemographics &&
    "medianDisposableIncomeDepartmentEur" in territory.enrichment.sociodemographics
      ? (
          territory.enrichment.sociodemographics as {
            medianDisposableIncomeDepartmentEur?: number | null;
          }
        ).medianDisposableIncomeDepartmentEur
      : null;

  if (
    income === null ||
    income === undefined ||
    reference === null ||
    reference === undefined
  ) {
    return false;
  }

  return income < reference;
}

export function countSocioEconomicFragilitySignals(
  territory: TerritoryProfile,
): number {
  const sociodemographics = territory.enrichment?.sociodemographics;
  const housing = territory.enrichment?.housing;
  const urbanPolicy = territory.enrichment?.urbanPolicy;
  let count = 0;

  if (hasModerateMedianIncomeForComposite(sociodemographics?.medianDisposableIncome)) {
    count += 1;
  }
  if (qualifiesAsUnemploymentWatchPoint(sociodemographics?.unemploymentRate)) {
    count += 1;
  }
  if (urbanPolicy?.hasQpv === true) {
    count += 1;
  }
  if (
    housing?.rpVacancyRatePercent != null &&
    housing.rpVacancyRatePercent >= VACANCY_FRAGILITY_THRESHOLD_PERCENT
  ) {
    count += 1;
  }

  return count;
}

export function qualifiesAsIncomeWatchPoint(territory: TerritoryProfile): boolean {
  const income = territory.enrichment?.sociodemographics?.medianDisposableIncome;
  if (income === null || income === undefined) {
    return false;
  }

  if (hasUnfavorableIncomeComparison(territory)) {
    return true;
  }

  if (qualifiesAsLowMedianIncomeForWatchPoint(income)) {
    return true;
  }

  if (
    hasModerateMedianIncomeForComposite(income) &&
    countSocioEconomicFragilitySignals(territory) >= 2
  ) {
    return true;
  }

  return false;
}

export function usesCompositeIncomeWatchPointRationale(
  territory: TerritoryProfile,
): boolean {
  const income = territory.enrichment?.sociodemographics?.medianDisposableIncome;
  if (income === null || income === undefined) {
    return false;
  }

  if (hasUnfavorableIncomeComparison(territory)) {
    return false;
  }

  if (qualifiesAsLowMedianIncomeForWatchPoint(income)) {
    return false;
  }

  return (
    hasModerateMedianIncomeForComposite(income) &&
    countSocioEconomicFragilitySignals(territory) >= 2
  );
}

export function buildIncomeWatchPointSentence(territory: TerritoryProfile): string {
  const sociodemographics = territory.enrichment!.sociodemographics!;
  const income = sociodemographics.medianDisposableIncome!;
  const year = sociodemographics.year;

  if (usesCompositeIncomeWatchPointRationale(territory)) {
    return (
      `Les indicateurs socio-économiques disponibles signalent une fragilité relative, ` +
      `dont un revenu médian de ${formatEuro(income)} (FILOSOFI ${year}).`
    );
  }

  if (hasUnfavorableIncomeComparison(territory)) {
    return (
      `Le revenu médian disponible apparaît inférieur à la référence disponible, ` +
      `à interpréter avec prudence (${formatEuro(income)}, FILOSOFI ${year}).`
    );
  }

  return (
    `Le revenu médian disponible apparaît faible au regard des repères retenus, ` +
    `à interpréter avec prudence (${formatEuro(income)}, FILOSOFI ${year}).`
  );
}

export function isDescriptiveIncomeWatchPointSentence(sentence: string): boolean {
  return DESCRIPTIVE_INCOME_SENTENCE_PATTERN.test(sentence);
}

function isDebtFact(fact: AnalysisFact): boolean {
  return fact.theme === "finances" && /dette/i.test(fact.sentence);
}

function isIncomeFact(fact: AnalysisFact): boolean {
  return fact.theme === "income";
}

export function isEligibleEmploymentWatchPoint(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  if (fact.theme !== "employment") {
    return true;
  }
  return qualifiesAsUnemploymentWatchPoint(
    territory.enrichment?.sociodemographics?.unemploymentRate,
  );
}

export function isEligibleFinancesWatchPoint(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  if (!isDebtFact(fact)) {
    return true;
  }
  return qualifiesAsDebtWatchPoint(
    territory.enrichment?.publicAccounts?.debtPerCapitaEur,
  );
}

export function isEligibleIncomeWatchPoint(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  if (!isIncomeFact(fact)) {
    return true;
  }

  if (!qualifiesAsIncomeWatchPoint(territory)) {
    return false;
  }

  if (isDescriptiveIncomeWatchPointSentence(fact.sentence)) {
    return false;
  }

  return true;
}

/** Filtre générique pour la sélection/scoring des watchPoints socio-économiques. */
export function isEligibleSocioEconomicWatchPoint(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  return (
    isEligibleEmploymentWatchPoint(fact, territory) &&
    isEligibleFinancesWatchPoint(fact, territory) &&
    isEligibleIncomeWatchPoint(fact, territory)
  );
}
