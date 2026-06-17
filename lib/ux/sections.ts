import type { TerritoryProfile } from "@/lib/types";

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
    isAvailable: (t) => t.enrichment?.equipments?.available === true,
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
    isAvailable: (t) => t.enrichment?.mobility?.available === true,
  },
  {
    id: "fiscalite",
    label: "Fiscalité",
    isAvailable: (t) => t.enrichment?.fiscal?.available === true,
  },
  {
    id: "geographie",
    label: "Géographie",
    isAvailable: (t) =>
      t.enrichment?.geography?.attractionArea?.available === true ||
      t.enrichment?.geography?.epciComparison?.available === true,
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
