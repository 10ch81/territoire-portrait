import { RP_VINTAGE } from "@/lib/sources";
import type { TerritoryProfile } from "@/lib/types";

const STALE_VINTAGE_YEARS = 3;

export function collectTerritoryReadingAlerts(territory: TerritoryProfile): string[] {
  const alerts = new Set<string>();
  const currentYear = new Date().getFullYear();
  const tourism = territory.enrichment?.tourism;
  const population = territory.population;

  if (
    tourism?.available &&
    population &&
    population > 0 &&
    tourism.accommodationPlaces / population >= 0.05
  ) {
    alerts.add(
      "Forte capacité touristique : les ratios par habitant (équipements, résidences secondaires) se lisent avec prudence.",
    );
  }

  const secondaryShare =
    territory.enrichment?.housing?.secondaryResidenceSharePercent ?? null;
  if (secondaryShare !== null && secondaryShare >= 20) {
    alerts.add(
      "Part élevée de résidences secondaires — commune à dominante touristique ou résidentielle secondaire.",
    );
  }

  const sociodemographics = territory.enrichment?.sociodemographics;
  if (
    sociodemographics?.available &&
    sociodemographics.year &&
    sociodemographics.year < RP_VINTAGE
  ) {
    alerts.add(
      `Certaines données démographiques RP datent de ${sociodemographics.year} (millésime antérieur au RP ${RP_VINTAGE} en cache).`,
    );
  }

  const property = territory.enrichment?.property;
  if (
    property?.available &&
    property.year &&
    currentYear - property.year > STALE_VINTAGE_YEARS
  ) {
    alerts.add(
      `Les prix DVF affichés datent de ${property.year} — vérifier l'actualité du marché local.`,
    );
  }

  const profile = territory.enrichment?.territoryTypology?.comparisonProfile;
  if (profile === "metropole" || profile === "grande_ville") {
    alerts.add(
      "Commune urbaine dense : comparer de préférence à des communes de même profil territorial.",
    );
  }

  if (population !== null && population < 500) {
    alerts.add(
      "Petite commune (< 500 hab.) : plusieurs indicateurs sont fragiles ou non diffusés (secret statistique).",
    );
  }

  if (!territory.enrichment?.geography?.attractionArea?.available) {
    alerts.add(
      `Aire d'attraction non disponible en cache — profil territorial partiel (lancer ingest:geography si besoin).`,
    );
  }

  return [...alerts];
}

export function collectComparisonReadingAlerts(
  territories: TerritoryProfile[],
): string[] {
  const alerts = new Set<string>();

  alerts.add(
    "Les communes de nature différente (centre-ville, périurbain, rural) ne se comparent pas toujours sur les mêmes indicateurs.",
  );

  for (const territory of territories) {
    for (const alert of collectTerritoryReadingAlerts(territory)) {
      alerts.add(alert);
    }
  }

  return [...alerts];
}
