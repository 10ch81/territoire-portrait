import type { TerritoryProfile } from "../../types";
import { buildTerritoryContext } from "./buildTerritoryContext";

/**
 * Libellé typologique affiché dans le résumé déterministe.
 * Surcharge uniquement le profil montagne touristique très certain (Chamonix-like).
 */
export function resolveDisplayTypologyLabel(territory: TerritoryProfile): string | null {
  const raw = territory.enrichment?.territoryTypology?.summaryLabel?.trim();
  const context = buildTerritoryContext(territory);
  const uuRole = territory.enrichment?.territoryTypology?.urbanUnit?.role;
  const isVilleCentre = uuRole === "ville_centre";

  if (
    context.isTouristCommune === true &&
    context.isMountainOrNaturalRiskProfile === true &&
    context.hasHighTourismCapacityPerResident === true &&
    (isVilleCentre || context.isCentralityInEpci === true)
  ) {
    return "ville-centre de montagne à forte vocation touristique";
  }

  return raw || null;
}
