import type { TerritoryProfile } from "../../types";
import { buildTerritoryContext } from "./buildTerritoryContext";

/**
 * Libellé typologique affiché dans le résumé déterministe.
 * Peut surcharger le summaryLabel brut lorsque le contexte territorial le justifie.
 */
export function resolveDisplayTypologyLabel(territory: TerritoryProfile): string | null {
  const raw = territory.enrichment?.territoryTypology?.summaryLabel?.trim();
  const context = buildTerritoryContext(territory);
  const uuRole = territory.enrichment?.territoryTypology?.urbanUnit?.role;
  const isVilleCentre = uuRole === "ville_centre";

  if (
    context.isTouristCommune === true &&
    context.isMountainOrNaturalRiskProfile === true &&
    (isVilleCentre || context.isCentralityInEpci === true)
  ) {
    return "ville-centre de montagne à forte vocation touristique";
  }

  if (
    context.isTouristCommune === true &&
    context.hasTourismEmploymentProfile === true &&
    isVilleCentre
  ) {
    return "ville-centre à forte centralité touristique";
  }

  if (context.isTouristCommune === true && context.hasHighTourismCapacityPerResident === true) {
    return "commune à forte vocation touristique";
  }

  if (context.isTouristCommune === true && context.hasTourismEmploymentProfile === true) {
    return "centralité touristique";
  }

  return raw || null;
}
