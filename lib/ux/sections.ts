import {
  isConnectivityAvailable,
  isMobilityAvailable,
} from "@/lib/enrichment/mobility-snapshot";
import type { TerritoryProfile } from "@/lib/types";

export function isEquipmentsSectionAvailable(
  territory: TerritoryProfile,
): boolean {
  const enrichment = territory.enrichment;
  if (!enrichment) {
    return false;
  }

  return (
    enrichment.equipments?.available === true ||
    (enrichment.mobility != null &&
      isConnectivityAvailable(enrichment.mobility)) ||
    enrichment.education?.available === true ||
    enrichment.education?.averageIps !== null
  );
}

export interface NavSection {
  id: string;
  label: string;
}

interface SectionDef extends NavSection {
  isAvailable: (territory: TerritoryProfile) => boolean;
}

export const ENRICHMENT_SECTIONS: SectionDef[] = [
  {
    id: "demographie",
    label: "Démographie",
    isAvailable: () => true,
  },
  {
    id: "economie",
    label: "Économie",
    isAvailable: () => true,
  },
  {
    id: "equipements",
    label: "Équipements",
    isAvailable: isEquipmentsSectionAvailable,
  },
  {
    id: "sante",
    label: "Santé",
    isAvailable: (t) => t.enrichment?.health != null,
  },
  {
    id: "risques",
    label: "Risques",
    isAvailable: (t) => t.enrichment?.risks?.available === true,
  },
  {
    id: "securite",
    label: "Sécurité",
    isAvailable: (t) => t.enrichment?.security != null,
  },
  {
    id: "logement",
    label: "Logement",
    isAvailable: (t) => t.enrichment?.housing?.available === true,
  },
  {
    id: "mobilite",
    label: "Mobilité",
    isAvailable: (t) =>
      t.enrichment?.mobility != null &&
      isMobilityAvailable(t.enrichment.mobility),
  },
  {
    id: "politique-ville",
    label: "Politique ville",
    isAvailable: (t) => t.enrichment?.urbanPolicy?.available === true,
  },
  {
    id: "fiscalite",
    label: "Finances locales",
    isAvailable: (t) =>
      t.enrichment?.fiscal?.available === true ||
      t.enrichment?.publicAccounts?.available === true,
  },
  {
    id: "services-proximite",
    label: "Services proximité",
    isAvailable: (t) => t.enrichment?.proximityServices?.available === true,
  },
  {
    id: "tourisme",
    label: "Tourisme",
    isAvailable: (t) => t.enrichment?.tourism?.available === true,
  },
  {
    id: "geographie",
    label: "Géographie",
    isAvailable: (t) =>
      t.enrichment?.geography?.attractionArea?.available === true ||
      t.enrichment?.geography?.epciComparison?.available === true ||
      (t.enrichment?.territoryTypology?.availableFamilies.length ?? 0) > 0,
  },
  {
    id: "immobilier",
    label: "Immobilier",
    isAvailable: (t) => t.enrichment?.property?.available === true,
  },
  {
    id: "sources",
    label: "Sources",
    isAvailable: () => true,
  },
];

export function getVisibleSections(territory: TerritoryProfile): NavSection[] {
  return ENRICHMENT_SECTIONS.filter((s) => s.isAvailable(territory)).map(
    ({ id, label }) => ({ id, label }),
  );
}
