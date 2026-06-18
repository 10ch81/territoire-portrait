import {
  formatDensity,
  formatPercent,
  formatPropertyPrice,
} from "@/lib/enrichment";
import { formatPopulation } from "@/lib/territory";
import { getPopulationDisplayMeta } from "@/lib/ux/population";
import type { TerritoryProfile } from "@/lib/types";

export interface KpiItem {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

export function extractHeroKpis(territory: TerritoryProfile): KpiItem[] {
  const enrichment = territory.enrichment;
  const derived = enrichment?.derived;
  const property = enrichment?.property;
  const geography = enrichment?.geography;
  const populationMeta = getPopulationDisplayMeta(territory);
  const kpis: KpiItem[] = [];

  kpis.push({
    id: "population",
    label: populationMeta.label,
    value: formatPopulation(territory.population),
    hint: populationMeta.definition,
  });

  kpis.push({
    id: "density",
    label: "Densité",
    value: formatDensity(territory.densityPerKm2),
  });

  if (derived?.populationGrowthPercent != null) {
    kpis.push({
      id: "growth",
      label: `Croissance ${derived.populationGrowthFromYear ?? ""}→${derived.populationGrowthToYear ?? ""}`,
      value: formatPercent(derived.populationGrowthPercent),
    });
  }

  if (property?.available && property.averagePricePerM2 != null) {
    kpis.push({
      id: "property",
      label: `Prix m² (DVF ${property.year})`,
      value: formatPropertyPrice(
        property.averagePricePerM2,
        property.mutationCount,
      ),
    });
  }

  if (
    geography?.epciComparison?.available &&
    geography.epciComparison.communeRankByPopulation != null
  ) {
    kpis.push({
      id: "epci-rank",
      label: "Rang population (EPCI)",
      value: `${geography.epciComparison.communeRankByPopulation} / ${geography.epciComparison.communeCount}`,
      hint: geography.epciComparison.epciName,
    });
  }

  if (derived?.equipmentsPer1000Residents != null) {
    kpis.push({
      id: "equipments",
      label: "Équipements / 1 000 hab.",
      value: new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 1,
      }).format(derived.equipmentsPer1000Residents),
    });
  } else if (derived?.irvePointsPer1000Residents != null) {
    kpis.push({
      id: "irve",
      label: "Points IRVE / 1 000 hab.",
      value: new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 1,
      }).format(derived.irvePointsPer1000Residents),
    });
  }

  return kpis.slice(0, 6);
}
