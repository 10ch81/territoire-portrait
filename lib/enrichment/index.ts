import { mergeSources } from "../sources";
import { getTerritoryByInsee } from "../territory";
import type { DataSource, TerritoryEnrichment, TerritoryProfile } from "../types";
import { fetchEnterpriseSnapshot, createEnterpriseSource } from "./enterprises";
import { loadEquipmentSnapshot, createBpeSource } from "./equipments";
import {
  loadPopulationHistorySnapshot,
  createPopulationHistorySource,
} from "./population";
import { fetchRisksSnapshot, createGeorisquesSource } from "./risks";
import { loadSocialHousingSnapshot, createRplsSource } from "./housing";
import { loadIrveSnapshot, createIrveSource } from "./mobility";
import { loadLocalTaxSnapshot, createReiSource } from "./fiscal";
import { loadGeographySnapshot, createAavSource } from "./geography";
import { loadPropertyMarketSnapshot, createDvfSource } from "./property";
import {
  loadSociodemographicsSnapshot,
  createFilosofiSource,
  createRpEmploymentSource,
  createRpPopulationSource,
} from "./sociodemographics";

function collectEnrichmentSources(
  accessedAt: string,
  enrichment: TerritoryEnrichment,
): DataSource[] {
  const sources: DataSource[] = [];

  if (enrichment.populationHistory?.available) {
    sources.push(createPopulationHistorySource(accessedAt));
  }
  if (enrichment.sociodemographics?.available) {
    sources.push(createRpPopulationSource(accessedAt));
    if (enrichment.sociodemographics.unemploymentRate !== null) {
      sources.push(createRpEmploymentSource(accessedAt));
    }
    if (enrichment.sociodemographics.medianDisposableIncome !== null) {
      sources.push(createFilosofiSource(accessedAt));
    }
  }
  if (enrichment.enterprises) {
    sources.push(createEnterpriseSource(accessedAt));
  }
  if (enrichment.equipments?.available) {
    sources.push(createBpeSource(accessedAt));
  }
  if (enrichment.risks?.available) {
    sources.push(createGeorisquesSource(accessedAt));
  }
  if (enrichment.housing?.available) {
    sources.push(createRplsSource(accessedAt));
  }
  if (enrichment.mobility?.available) {
    sources.push(createIrveSource(accessedAt));
  }
  if (enrichment.fiscal?.available) {
    sources.push(createReiSource(accessedAt));
  }
  if (enrichment.geography?.attractionArea?.available) {
    sources.push(createAavSource(accessedAt));
  }
  if (enrichment.property?.available) {
    sources.push(createDvfSource(accessedAt));
  }

  return sources;
}

export async function enrichTerritory(
  territory: TerritoryProfile,
): Promise<TerritoryProfile> {
  const accessedAt = new Date().toISOString();

  const [
    enterprises,
    risks,
    geography,
  ] = await Promise.all([
    fetchEnterpriseSnapshot(territory.inseeCode),
    fetchRisksSnapshot(territory.inseeCode),
    loadGeographySnapshot(territory),
  ]);

  const populationHistory = loadPopulationHistorySnapshot(territory.inseeCode);
  const sociodemographics = loadSociodemographicsSnapshot(territory.inseeCode);
  const equipments = loadEquipmentSnapshot(territory.inseeCode);
  const housing = loadSocialHousingSnapshot(territory.inseeCode);
  const mobility = loadIrveSnapshot(territory.inseeCode);
  const fiscal = loadLocalTaxSnapshot(territory.inseeCode);
  const property = loadPropertyMarketSnapshot(territory.inseeCode);

  const enrichment: TerritoryEnrichment = {
    populationHistory,
    sociodemographics,
    enterprises,
    equipments,
    risks,
    housing,
    mobility,
    fiscal,
    geography,
    property,
    sources: [],
  };

  const enrichmentSources = collectEnrichmentSources(accessedAt, enrichment);
  enrichment.sources = enrichmentSources;

  return {
    ...territory,
    sources: mergeSources(territory.sources, enrichmentSources),
    enrichment,
  };
}

export async function getEnrichedTerritoryByInsee(
  inseeCode: string,
): Promise<TerritoryProfile | null> {
  const territory = await getTerritoryByInsee(inseeCode);

  if (!territory) {
    return null;
  }

  return enrichTerritory(territory);
}

export function formatDensity(densityPerKm2: number | null): string {
  if (densityPerKm2 === null) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(densityPerKm2)} hab./km²`;
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} %`;
}

export function formatCurrency(value: number | null): string {
  if (value === null) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} €`;
}

export function formatRate(value: number | null): string {
  if (value === null) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} %`;
}
