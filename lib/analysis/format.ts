import { formatFrenchPercentOneDecimal } from "../age-aggregates";
import { formatFrenchSignedPercent } from "../demographic-indicators";

export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
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
