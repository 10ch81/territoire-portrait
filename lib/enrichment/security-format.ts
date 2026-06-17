export function formatRatePer1000(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value)} / 1 000 hab.`;
}
