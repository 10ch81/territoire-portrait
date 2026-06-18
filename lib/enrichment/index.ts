import { mergeSources, createRpHousingSource, createInseeSideSource } from "../sources";
import { getTerritoryByInsee } from "../territory";
import type { DataSource, TerritoryEnrichment, TerritoryProfile } from "../types";
import { fetchEnterpriseSnapshot, createEnterpriseSource } from "./enterprises";
import {
  loadEmploymentSectorsSnapshot,
  createFloresSource,
} from "./employment-sectors";
import { loadEquipmentSnapshot, createBpeSource } from "./equipments";
import { loadEducationSnapshot, createEducationSource } from "./education";
import { loadHealthSnapshot, createFinessSource } from "./health";
import {
  loadPopulationHistorySnapshot,
  createPopulationHistorySource,
} from "./population";
import { fetchRisksSnapshot, createGeorisquesSource } from "./risks";
import {
  loadMobilitySnapshot,
  isMobilityAvailable,
  createCommuteSource,
  createIrveSource,
  createArcepSource,
} from "./mobility";
import { loadQpvSnapshot, createQpvSource } from "./urban-policy";
import { loadSocialHousingSnapshot, createRplsSource } from "./housing";
import { loadLocalTaxSnapshot, createReiSource } from "./fiscal";
import {
  fetchPublicAccountsSnapshot,
  createOfglSource,
} from "./public-accounts";
import {
  loadProximityServicesSnapshot,
  createFranceServicesSource,
} from "./proximity-services";
import { loadTourismSnapshot, createTourismSource } from "./tourism";
import { loadGeographySnapshot, createAavSource } from "./geography";
import { loadPropertyMarketSnapshot, createDvfSource } from "./property";
import { loadSecuritySnapshot, createSsmsiSource } from "./security";
import { computeDerivedIndicators } from "./derived";
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
    if (enrichment.enterprises.inseeLegalUnits !== null) {
      sources.push(createInseeSideSource(accessedAt));
    }
  }
  if (enrichment.employmentSectors?.available) {
    sources.push(createFloresSource(accessedAt));
  }
  if (enrichment.equipments?.available) {
    sources.push(createBpeSource(accessedAt));
  }
  if (enrichment.education?.available) {
    sources.push(createEducationSource(accessedAt));
  }
  if (enrichment.health?.available) {
    sources.push(createFinessSource(accessedAt));
  }
  if (enrichment.risks?.available) {
    sources.push(createGeorisquesSource(accessedAt));
  }
  if (enrichment.security?.available) {
    sources.push(createSsmsiSource(accessedAt));
  }
  if (enrichment.housing?.available) {
    sources.push(createRplsSource(accessedAt));
    if (enrichment.housing.rpVacancyRatePercent !== null) {
      sources.push(createRpHousingSource(accessedAt));
    }
  }
  if (enrichment.mobility && isMobilityAvailable(enrichment.mobility)) {
    if (enrichment.mobility.irve.available) {
      sources.push(createIrveSource(accessedAt));
    }
    if (enrichment.mobility.commute.available) {
      sources.push(createCommuteSource(accessedAt));
    }
    if (enrichment.mobility.connectivity.available) {
      sources.push(createArcepSource(accessedAt));
    }
  }
  if (enrichment.urbanPolicy?.available) {
    sources.push(createQpvSource(accessedAt));
  }
  if (enrichment.fiscal?.available) {
    sources.push(createReiSource(accessedAt));
  }
  if (enrichment.publicAccounts?.available) {
    sources.push(createOfglSource(accessedAt));
  }
  if (enrichment.proximityServices?.available) {
    sources.push(createFranceServicesSource(accessedAt));
  }
  if (enrichment.tourism?.available) {
    sources.push(createTourismSource(accessedAt));
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
    publicAccounts,
  ] = await Promise.all([
    fetchEnterpriseSnapshot(territory.inseeCode),
    fetchRisksSnapshot(territory.inseeCode),
    loadGeographySnapshot(territory),
    fetchPublicAccountsSnapshot(territory.inseeCode),
  ]);

  const populationHistory = loadPopulationHistorySnapshot(territory.inseeCode);
  const sociodemographics = loadSociodemographicsSnapshot(territory.inseeCode);
  const employmentSectors = loadEmploymentSectorsSnapshot(territory.inseeCode);
  const equipments = loadEquipmentSnapshot(territory.inseeCode);
  const education = loadEducationSnapshot(territory.inseeCode);
  const health = loadHealthSnapshot(territory.inseeCode);
  const housing = loadSocialHousingSnapshot(territory.inseeCode);
  const mobility = loadMobilitySnapshot(territory.inseeCode);
  const urbanPolicy = loadQpvSnapshot(territory.inseeCode);
  const fiscal = loadLocalTaxSnapshot(territory.inseeCode);
  const proximityServices = loadProximityServicesSnapshot(territory.inseeCode);
  const tourism = loadTourismSnapshot(territory.inseeCode);
  const property = loadPropertyMarketSnapshot(territory.inseeCode);
  const security = loadSecuritySnapshot(territory);

  const enrichment: TerritoryEnrichment = {
    populationHistory,
    sociodemographics,
    enterprises,
    employmentSectors,
    equipments,
    education,
    health,
    risks,
    security,
    housing,
    mobility,
    urbanPolicy,
    fiscal,
    publicAccounts,
    proximityServices,
    tourism,
    geography,
    property,
    derived: null,
    sources: [],
  };

  enrichment.derived = computeDerivedIndicators(territory, enrichment);

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

function isDisplayableNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function formatPercent(value: number | null): string {
  if (!isDisplayableNumber(value)) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} %`;
}

export function formatCurrency(value: number | null): string {
  if (!isDisplayableNumber(value)) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} €`;
}

export function formatRate(value: number | null): string {
  if (!isDisplayableNumber(value)) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} %`;
}

export function formatPropertyPrice(
  value: number | null,
  mutationCount: number | null,
): string {
  if (isDisplayableNumber(value)) {
    return formatCurrency(value);
  }

  if (mutationCount !== null && mutationCount > 0) {
    return `Non publié (${new Intl.NumberFormat("fr-FR").format(mutationCount)} mutations)`;
  }

  return "Donnée non disponible";
}
