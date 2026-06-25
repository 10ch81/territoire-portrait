function isDisplayableNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function formatDensity(densityPerKm2: number | null): string {
  if (densityPerKm2 === null) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(densityPerKm2)} hab./km²`;
}

export function formatPercent(value: number | null): string {
  if (!isDisplayableNumber(value)) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} %`;
}

export function formatCurrency(value: number | null): string {
  if (!isDisplayableNumber(value)) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} €`;
}

export function formatRate(value: number | null): string {
  if (!isDisplayableNumber(value)) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} %`;
}

export function formatPropertyPrice(
  value: number | null,
  mutationCount: number | null,
): string {
  if (isDisplayableNumber(value)) {
    return formatCurrency(value);
  }

  if (mutationCount !== null && mutationCount > 0) {
    return `Non publié (${new Intl.NumberFormat("fr-FR").format(mutationCount)} mutations)`;
  }

  return "Donnée non disponible";
}
