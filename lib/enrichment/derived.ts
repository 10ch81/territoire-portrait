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
    population && population > 0 && enrichment.mobility?.irve.available
      ? roundOneDecimal(
          (enrichment.mobility.irve.chargingPoints / population) * 1000,
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

  const housing = enrichment.housing;
  let lovacRpVacancySpreadPercent: number | null = null;
  if (
    housing?.available &&
    housing.rpVacancyRatePercent !== null &&
    housing.privateVacancyRatePercent !== null
  ) {
    lovacRpVacancySpreadPercent = roundOneDecimal(
      housing.privateVacancyRatePercent - housing.rpVacancyRatePercent,
    );
  }

  const property = enrichment.property;
  let realEstatePremiumRatio: number | null = null;
  if (
    property?.available &&
    property.averagePricePerM2 !== null &&
    property.departmentAveragePricePerM2 !== null &&
    property.departmentAveragePricePerM2 > 0
  ) {
    realEstatePremiumRatio = roundOneDecimal(
      property.averagePricePerM2 / property.departmentAveragePricePerM2,
    );
  }

  const available = Boolean(
    populationGrowthPercent !== null ||
      irvePointsPer1000Residents !== null ||
      socialHousingVacancyRatePercent !== null ||
      equipmentsPer1000Residents !== null ||
      lovacRpVacancySpreadPercent !== null ||
      realEstatePremiumRatio !== null,
  );

  return {
    populationGrowthPercent,
    populationGrowthFromYear,
    populationGrowthToYear,
    irvePointsPer1000Residents,
    socialHousingVacancyRatePercent,
    equipmentsPer1000Residents,
    lovacRpVacancySpreadPercent,
    realEstatePremiumRatio,
    available,
    note:
      "Indicateurs dérivés calculés à partir des données disponibles (population, IRVE, RPLS, BPE, logement, DVF).",
  };
}
