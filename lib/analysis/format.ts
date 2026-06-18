import { formatFrenchPercentOneDecimal } from "../age-aggregates";
import { formatFrenchSignedPercent } from "../demographic-indicators";

export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

/** Valeur numérique avec nuance de plafond API (≥) si applicable. */
export function formatBoundedCount(value: number, isCapped: boolean): string {
  const formatted = formatCount(value);
  return isCapped ? `≥ ${formatted}` : formatted;
}

/** Libellé complet « au moins N unités » pour les plafonds API. */
export function formatBoundedCountLabel(
  value: number,
  isCapped: boolean,
  unitLabel: string,
): string {
  const formatted = formatCount(value);
  return isCapped ? `au moins ${formatted} ${unitLabel}` : `${formatted} ${unitLabel}`;
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${formatFrenchPercentOneDecimal(value)} %`;
}

export function formatSignedPercent(value: number): string {
  return formatFrenchSignedPercent(value);
}

export function formatPricePerM2(value: number): string {
  return `${formatCount(Math.round(value))} €/m²`;
}
