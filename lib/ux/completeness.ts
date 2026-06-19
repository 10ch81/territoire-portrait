import {
  isConnectivityAvailable,
  isMobilityAvailable,
} from "@/lib/enrichment/mobility-snapshot";
import type { TerritoryProfile } from "@/lib/types";

export interface CompletenessResult {
  available: number;
  total: number;
  percent: number;
  label: string;
}

const ENRICHMENT_CHECKS: Array<{
  id: string;
  isAvailable: (territory: TerritoryProfile) => boolean;
}> = [
  {
    id: "geo",
    isAvailable: (t) => t.department !== null && t.region !== null,
  },
  {
    id: "population-history",
    isAvailable: (t) => t.enrichment?.populationHistory?.available === true,
  },
  {
    id: "sociodemographics",
    isAvailable: (t) => t.enrichment?.sociodemographics?.available === true,
  },
  {
    id: "enterprises",
    isAvailable: (t) => t.enrichment?.enterprises !== null,
  },
  {
    id: "equipments",
    isAvailable: (t) =>
      t.enrichment?.equipments?.available === true ||
      (t.enrichment?.mobility != null &&
        isConnectivityAvailable(t.enrichment.mobility)),
  },
  {
    id: "risks",
    isAvailable: (t) => t.enrichment?.risks?.available === true,
  },
  {
    id: "security",
    isAvailable: (t) => t.enrichment?.security?.available === true,
  },
  {
    id: "housing",
    isAvailable: (t) => t.enrichment?.housing?.available === true,
  },
  {
    id: "mobility",
    isAvailable: (t) =>
      t.enrichment?.mobility != null &&
      isMobilityAvailable(t.enrichment.mobility),
  },
  {
    id: "urban-policy",
    isAvailable: (t) => t.enrichment?.urbanPolicy?.available === true,
  },
  {
    id: "fiscal",
    isAvailable: (t) =>
      t.enrichment?.fiscal?.available === true ||
      t.enrichment?.publicAccounts?.available === true,
  },
  {
    id: "proximity-services",
    isAvailable: (t) => t.enrichment?.proximityServices?.available === true,
  },
  {
    id: "tourism",
    isAvailable: (t) => t.enrichment?.tourism?.available === true,
  },
  {
    id: "geography",
    isAvailable: (t) =>
      t.enrichment?.geography?.attractionArea?.available === true ||
      (t.enrichment?.territoryTypology?.availableFamilies.length ?? 0) > 0,
  },
  {
    id: "property",
    isAvailable: (t) => t.enrichment?.property?.available === true,
  },
  {
    id: "education",
    isAvailable: (t) => t.enrichment?.education?.available === true,
  },
  {
    id: "health",
    isAvailable: (t) => t.enrichment?.health?.available === true,
  },
  {
    id: "employment-sectors",
    isAvailable: (t) => t.enrichment?.employmentSectors?.available === true,
  },
  {
    id: "mistral",
    isAvailable: () => false,
  },
];

export function computeCompleteness(
  territory: TerritoryProfile,
): CompletenessResult {
  const checks = ENRICHMENT_CHECKS.filter((c) => c.id !== "mistral");
  const available = checks.filter((c) => c.isAvailable(territory)).length;
  const total = checks.length;
  const percent = total > 0 ? Math.round((available / total) * 100) : 0;

  return {
    available,
    total,
    percent,
    label: `${available}/${total} familles de données disponibles (${percent} %)`,
  };
}
