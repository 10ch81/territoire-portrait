import type { TerritoryProfile } from "../types";

/** Millésime des populations légales diffusées par l'API Géo (geo.api.gouv.fr). */
export const LEGAL_POPULATION_VINTAGE = 2022;

export const LEGAL_POPULATION_DEFINITION =
  "Population municipale (populations légales INSEE, sans doubles comptages).";

export interface PopulationDisplayMeta {
  vintage: number;
  definition: string;
  label: string;
  consistencyNotes: string[];
}

export function getPopulationDisplayMeta(
  territory: TerritoryProfile,
): PopulationDisplayMeta {
  const consistencyNotes: string[] = [];
  const history = territory.enrichment?.populationHistory;
  const sociodemographics = territory.enrichment?.sociodemographics;

  if (
    territory.population !== null &&
    history?.latestPopulation != null &&
    history.latestYear !== null &&
    history.latestPopulation !== territory.population
  ) {
    consistencyNotes.push(
      `Écart entre API Géo (${formatCount(territory.population)}, millésime ${LEGAL_POPULATION_VINTAGE}) ` +
        `et série historique INSEE ${history.latestYear} (${formatCount(history.latestPopulation)}) : ` +
        "millésimes ou arrondis distincts — utiliser la population légale affichée en tête de fiche.",
    );
  }

  if (sociodemographics?.available && sociodemographics.ageBands.length > 0) {
    const rpTotal = sociodemographics.ageBands.reduce(
      (sum, band) => sum + band.population,
      0,
    );

    if (
      territory.population !== null &&
      territory.population > 0 &&
      rpTotal > 0 &&
      Math.abs(rpTotal - territory.population) / territory.population > 0.02
    ) {
      consistencyNotes.push(
        `Recensement 2021 (${formatCount(rpTotal)} hab.) et population légale ${LEGAL_POPULATION_VINTAGE} ` +
          `(${formatCount(territory.population)} hab.) : périmètres et dates différents, pas une contradiction.`,
      );
    }
  }

  return {
    vintage: LEGAL_POPULATION_VINTAGE,
    definition: LEGAL_POPULATION_DEFINITION,
    label: `Population légale ${LEGAL_POPULATION_VINTAGE}`,
    consistencyNotes,
  };
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}
