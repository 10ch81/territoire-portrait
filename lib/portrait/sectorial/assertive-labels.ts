import {
  qualifiesAsStrongEmploymentStrength,
  qualifiesAsStrongEquipmentStrength,
  qualifiesAsStrongHealthStrength,
  qualifiesAsStrongYouthStrength,
  qualifiesForAttractiveUrbanOpening,
} from "@/lib/analysis/strength-signals";
import type { TerritoryProfile } from "@/lib/types";
import type { PortraitSectorId } from "../types";
import type { SectorRenderContext } from "./sector-catalog";

const ASSERTIVE_PATTERNS: Array<{ pattern: RegExp; sectorId: PortraitSectorId }> = [
  { pattern: /ville-centre dense et attractive/i, sectorId: "identity" },
  { pattern: /forte jeunesse/i, sectorId: "demography" },
  { pattern: /base économique importante/i, sectorId: "economy" },
  { pattern: /haut niveau d'équipements/i, sectorId: "equipments" },
  { pattern: /profil très équipé/i, sectorId: "health" },
];

export function resolveAssertiveLead(
  sectorId: PortraitSectorId,
  territory: TerritoryProfile,
): string | null {
  switch (sectorId) {
    case "identity": {
      if (!qualifiesForAttractiveUrbanOpening(territory)) {
        return null;
      }
      const growth = territory.enrichment?.derived?.populationGrowthPercent;
      if (growth === null || growth === undefined || growth <= 0) {
        return null;
      }
      return `${territory.name} apparaît comme une ville-centre dense et attractive`;
    }
    case "demography":
      return qualifiesAsStrongYouthStrength(territory)
        ? "Sa démographie est marquée par une forte jeunesse"
        : null;
    case "economy":
      return qualifiesAsStrongEmploymentStrength(territory)
        ? "La commune dispose d'une base économique importante"
        : null;
    case "equipments":
      return qualifiesAsStrongEquipmentStrength(territory)
        ? "La commune se distingue par un haut niveau d'équipements"
        : null;
    case "health":
      return qualifiesAsStrongHealthStrength(territory)
        ? "Sur le plan sanitaire et médico-social, la commune présente un profil très équipé"
        : null;
    default:
      return null;
  }
}

export function assertiveLabelAllowed(
  label: string,
  sectorId: PortraitSectorId,
  ctx: SectorRenderContext,
): boolean {
  const expected = resolveAssertiveLead(sectorId, ctx.territory);
  if (!expected) {
    return false;
  }
  return label.trim().toLowerCase().startsWith(expected.trim().toLowerCase().slice(0, 24));
}

export function findUnauthorizedAssertiveLabels(text: string): string[] {
  const violations: string[] = [];
  for (const { pattern, sectorId } of ASSERTIVE_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`assertive:${sectorId}`);
    }
  }
  return violations;
}
