import type { BpeCommuneCacheEntry, EquipmentDomainCount } from "./types";

export type BpeDomainMetric = "type-count";

export interface BpeBreakdownSemantics {
  domainMetric: BpeDomainMetric;
  domainSumReconcilesWithTotal: boolean;
  typeSumReconcilesWithTotal: boolean;
  topTypesPartial: boolean;
  topTypesLimit: number;
  qualitativeSummary: string;
}

const BPE_DOMAIN_THEMES: Record<string, string> = {
  A: "services de proximité",
  B: "commerces",
  C: "enseignement",
  D: "santé et action sociale",
  E: "transports",
  F: "équipements de loisirs",
  G: "tourisme",
};

export function sumRecordValues(record: Record<string, number>): number {
  return Object.values(record).reduce((acc, value) => acc + value, 0);
}

export function sumTransportTypeCounts(byType: Record<string, number>): number {
  return Object.entries(byType)
    .filter(([code]) => code.startsWith("E"))
    .reduce((acc, [, count]) => acc + count, 0);
}

export function buildDomainCounts(
  byDomain: Record<string, number>,
  domainLabels: Record<string, string>,
): EquipmentDomainCount[] {
  return Object.entries(byDomain)
    .map(([code, count]) => ({
      code,
      label: domainLabels[code] ?? code,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildQualitativeBpeSummary(
  totalEquipments: number,
  byDomain: EquipmentDomainCount[],
): string {
  const themes = byDomain
    .map((domain) => BPE_DOMAIN_THEMES[domain.code])
    .filter((theme, index, array): theme is string => Boolean(theme) && array.indexOf(theme) === index);

  if (themes.length === 0) {
    return `${totalEquipments} équipements recensés.`;
  }

  const lastTheme = themes.at(-1);
  const leadingThemes = themes.slice(0, -1);

  if (!lastTheme || leadingThemes.length === 0) {
    return `${totalEquipments} équipements recensés, avec une diversité de ${lastTheme ?? "équipements"}.`;
  }

  return `${totalEquipments} équipements recensés, avec une diversité de ${leadingThemes.join(", ")} et ${lastTheme}.`;
}

export function analyzeBpeBreakdown(
  entry: Pick<BpeCommuneCacheEntry, "total" | "byDomain" | "byType">,
  byDomain: EquipmentDomainCount[],
  topTypesLimit = 8,
): BpeBreakdownSemantics {
  const domainSum = sumRecordValues(entry.byDomain);
  const typeSum = sumRecordValues(entry.byType ?? {});
  const typeSumReconcilesWithTotal = entry.total > 0 && typeSum === entry.total;
  const domainSumReconcilesWithTotal = entry.total > 0 && domainSum === entry.total;

  return {
    domainMetric: "type-count",
    domainSumReconcilesWithTotal,
    typeSumReconcilesWithTotal,
    topTypesPartial: true,
    topTypesLimit,
    qualitativeSummary: buildQualitativeBpeSummary(entry.total, byDomain),
  };
}

export const BPE_DOMAIN_BREAKDOWN_LABEL =
  "Nombre de types d'équipements par domaine";

export const BPE_TOP_TYPES_LABEL =
  "Principaux types d'équipements (top 8, liste partielle)";

export const BPE_EQUIPMENT_NOTE =
  "Dénombrement INSEE BPE 2024 : le total correspond aux occurrences recensées. Les domaines indiquent le nombre de types par domaine (décomposition partielle, ne recompose pas le total). Les principaux types (top 8) sont une liste partielle, non exhaustive.";

export const BPE_TRANSPORT_NOTE_WITH_TYPES =
  "Équipements de transport recensés dans la BPE (occurrences par type) ; l'offre réelle de transport collectif (lignes, horaires, fréquence) n'est pas analysée.";

export const BPE_TRANSPORT_NOTE_LIMITED =
  "Équipements de transport recensés dans la BPE limités aux types listés ; l'offre réelle de transport collectif n'est pas analysée.";
