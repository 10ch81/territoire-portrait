import type {
  DerivedIndicatorsSnapshot,
  TerritoryEnrichment,
  TerritoryProfile,
} from "../types";

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeDerivedIndicators(
  territory: TerritoryProfile,
  enrichment: TerritoryEnrichment,
): DerivedIndicatorsSnapshot {
  const population = territory.population;
  const history = enrichment.populationHistory?.history ?? [];
  const firstPoint = history[0];
  const lastPoint = history.at(-1);

  let populationGrowthPercent: number | null = null;
  let populationGrowthFromYear: number | null = null;
  let populationGrowthToYear: number | null = null;

  if (
    firstPoint &&
    lastPoint &&
    firstPoint.year !== lastPoint.year &&
    firstPoint.population > 0
  ) {
    populationGrowthFromYear = firstPoint.year;
    populationGrowthToYear = lastPoint.year;
    populationGrowthPercent = roundOneDecimal(
      ((lastPoint.population - firstPoint.population) / firstPoint.population) *
        100,
    );
  }

  const irvePointsPer1000Residents =
    population && population > 0 && enrichment.mobility?.available
      ? roundOneDecimal(
          (enrichment.mobility.chargingPoints / population) * 1000,
        )
      : null;

  const socialHousingVacancyRatePercent =
    enrichment.housing?.vacancyRatePercent ?? null;

  const equipmentsPer1000Residents =
    population && population > 0 && enrichment.equipments?.available
      ? roundOneDecimal(
          (enrichment.equipments.totalEquipments / population) * 1000,
        )
      : null;

  const available = Boolean(
    populationGrowthPercent !== null ||
      irvePointsPer1000Residents !== null ||
      socialHousingVacancyRatePercent !== null ||
      equipmentsPer1000Residents !== null,
  );

  return {
    populationGrowthPercent,
    populationGrowthFromYear,
    populationGrowthToYear,
    irvePointsPer1000Residents,
    socialHousingVacancyRatePercent,
    equipmentsPer1000Residents,
    available,
    note:
      "Indicateurs dérivés calculés à partir des données disponibles (population, IRVE, RPLS, BPE).",
  };
}
