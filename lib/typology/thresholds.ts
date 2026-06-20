import type { TerritoryProfile } from "../types";
import type { ComparisonProfile } from "./types";

/** Seuil RP INSEE : vacance résidentielle élevée (%). */
export const VACANCY_WATCH_POINT_THRESHOLD_PERCENT = 10;

/** Seuil OFGL : dette par habitant élevée (€/hab.). */
export const DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR = 1_200;

/** Seuil vacance — métropole / grande ville (marché tendu, %). */
export const VACANCY_THRESHOLD_METRO_GRANDE_VILLE_PERCENT = 8;

/** Seuil vacance — petite centralité en déprise (%). */
export const VACANCY_THRESHOLD_PETITE_CENTRALITE_PERCENT = 12;

/** Seuil vacance — rural / rural isolé (%). */
export const VACANCY_THRESHOLD_RURAL_PERCENT = 15;

/** Seuil TC domicile-travail — métropole (%). */
export const PUBLIC_TRANSPORT_LOW_THRESHOLD_METRO_PERCENT = 10;

/** Seuil TC domicile-travail — profil intermédiaire (%). */
export const PUBLIC_TRANSPORT_LOW_THRESHOLD_DEFAULT_PERCENT = 5;

/** Seuil TC domicile-travail — périurbain (%). */
export const PUBLIC_TRANSPORT_LOW_THRESHOLD_PERIURBAIN_PERCENT = 3;

/** Seuil dette — métropole / grande ville (€/hab.). */
export const DEBT_THRESHOLD_METRO_GRANDE_VILLE_EUR = 1_000;

/** Seuil dette — petite commune (< 2 000 hab., €/hab.). */
export const DEBT_THRESHOLD_SMALL_COMMUNE_EUR = 1_500;

/** Ratio prix/m² communal vs département — pression immobilière élevée. */
export const HIGH_REAL_ESTATE_PREMIUM_RATIO = 1.15;

/** Seuil population — petite commune pour dette. */
export const SMALL_COMMUNE_POPULATION_THRESHOLD = 2_000;

export function resolveComparisonProfile(territory: TerritoryProfile): ComparisonProfile {
  return territory.enrichment?.territoryTypology?.comparisonProfile ?? "unknown";
}

export function vacancyWatchPointThresholdPercent(profile: ComparisonProfile): number {
  switch (profile) {
    case "metropole":
    case "grande_ville":
      return VACANCY_THRESHOLD_METRO_GRANDE_VILLE_PERCENT;
    case "petite_centralite":
      return VACANCY_THRESHOLD_PETITE_CENTRALITE_PERCENT;
    case "rural":
    case "rural_isole":
      return VACANCY_THRESHOLD_RURAL_PERCENT;
    default:
      return VACANCY_WATCH_POINT_THRESHOLD_PERCENT;
  }
}

export function qualifiesAsProfileAwareVacancyWatchPoint(
  vacancyRatePercent: number | null | undefined,
  profile: ComparisonProfile,
): boolean {
  if (vacancyRatePercent === null || vacancyRatePercent === undefined) {
    return false;
  }
  return vacancyRatePercent >= vacancyWatchPointThresholdPercent(profile);
}

/** Seuil LOVAC parc privé — mêmes repères typologiques que la vacance RP. */
export function lovacWatchPointThresholdPercent(profile: ComparisonProfile): number {
  return vacancyWatchPointThresholdPercent(profile);
}

export function qualifiesAsProfileAwareLovacWatchPoint(
  privateVacancyRatePercent: number | null | undefined,
  profile: ComparisonProfile,
): boolean {
  if (privateVacancyRatePercent === null || privateVacancyRatePercent === undefined) {
    return false;
  }
  return privateVacancyRatePercent >= lovacWatchPointThresholdPercent(profile);
}

export function qualifiesAsLowPublicTransportShare(
  sharePercent: number | null | undefined,
  profile: ComparisonProfile,
): boolean {
  if (sharePercent === null || sharePercent === undefined) {
    return false;
  }

  switch (profile) {
    case "rural":
    case "rural_isole":
      return false;
    case "metropole":
    case "grande_ville":
      return sharePercent < PUBLIC_TRANSPORT_LOW_THRESHOLD_METRO_PERCENT;
    case "periurbain":
      return sharePercent < PUBLIC_TRANSPORT_LOW_THRESHOLD_PERIURBAIN_PERCENT;
    default:
      return sharePercent < PUBLIC_TRANSPORT_LOW_THRESHOLD_DEFAULT_PERCENT;
  }
}

export function debtWatchPointThresholdEur(
  profile: ComparisonProfile,
  population: number | null,
): number {
  if (population !== null && population < SMALL_COMMUNE_POPULATION_THRESHOLD) {
    return DEBT_THRESHOLD_SMALL_COMMUNE_EUR;
  }

  if (profile === "metropole" || profile === "grande_ville") {
    return DEBT_THRESHOLD_METRO_GRANDE_VILLE_EUR;
  }

  return DEBT_PER_CAPITA_WATCH_POINT_THRESHOLD_EUR;
}

export function qualifiesAsProfileAwareDebtWatchPoint(
  debtPerCapitaEur: number | null | undefined,
  profile: ComparisonProfile,
  population: number | null,
): boolean {
  if (debtPerCapitaEur === null || debtPerCapitaEur === undefined) {
    return false;
  }
  return debtPerCapitaEur >= debtWatchPointThresholdEur(profile, population);
}

/** Seuil équipements / 1 000 hab. — commune rurale (volume attendu plus faible). */
export const EQUIPMENTS_PER_1000_RURAL_LOW_THRESHOLD = 20;

/** Seuil équipements / 1 000 hab. — centralité urbaine. */
export const EQUIPMENTS_PER_1000_URBAN_LOW_THRESHOLD = 40;

export function isLowEquipmentDensityForProfile(
  equipmentsPer1000: number | null | undefined,
  profile: ComparisonProfile,
): boolean {
  if (equipmentsPer1000 === null || equipmentsPer1000 === undefined) {
    return false;
  }

  switch (profile) {
    case "rural":
    case "rural_isole":
      return equipmentsPer1000 < EQUIPMENTS_PER_1000_RURAL_LOW_THRESHOLD;
    case "metropole":
    case "grande_ville":
    case "ville_moyenne":
      return equipmentsPer1000 < EQUIPMENTS_PER_1000_URBAN_LOW_THRESHOLD;
    default:
      return false;
  }
}
