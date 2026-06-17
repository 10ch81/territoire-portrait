export interface DataSource {
  id: string;
  name: string;
  url: string;
  description: string;
  accessedAt: string;
}

export interface TerritoryDepartment {
  code: string;
  name: string;
}

export interface TerritoryRegion {
  code: string;
  name: string;
}

export interface TerritoryEpci {
  code: string;
  name: string;
}

export interface TerritoryCoordinates {
  latitude: number;
  longitude: number;
}

export interface ActivitySectionCount {
  code: string;
  label: string;
  count: number;
}

export interface StaffSizeBandCount {
  code: string;
  label: string;
  count: number;
}

export interface EquipmentDomainCount {
  code: string;
  label: string;
  count: number;
}

export interface EquipmentTypeCount {
  code: string;
  label: string;
  count: number;
}

export interface PopulationYearCount {
  year: number;
  population: number;
}

export interface EnterpriseSnapshot {
  legalUnitsWithEstablishment: number | null;
  sampleSize: number;
  topActivitySections: ActivitySectionCount[];
  essCount: number | null;
  rgeCount: number | null;
  staffSizeBands: StaffSizeBandCount[];
  millesime: string;
  note: string;
}

export interface TransportSnapshot {
  totalEquipments: number;
  byType: EquipmentTypeCount[];
  available: boolean;
  note: string;
}

export interface EquipmentSnapshot {
  year: number;
  totalEquipments: number;
  byDomain: EquipmentDomainCount[];
  byType: EquipmentTypeCount[];
  transport: TransportSnapshot;
  available: boolean;
  note: string;
}

export interface AgeBandCount {
  label: string;
  population: number;
  sharePercent: number | null;
}

export interface SociodemographicsSnapshot {
  year: number;
  ageBands: AgeBandCount[];
  unemploymentRate: number | null;
  medianDisposableIncome: number | null;
  available: boolean;
  note: string;
}

export interface PopulationHistorySnapshot {
  latestYear: number | null;
  latestPopulation: number | null;
  history: PopulationYearCount[];
  available: boolean;
  note: string;
}

export interface RadonRisk {
  potentialClass: string;
  label: string;
}

export interface FloodRisk {
  zones: string[];
  count: number;
}

export interface CatNatEvent {
  label: string;
  startDate: string | null;
}

export interface RisksSnapshot {
  radon: RadonRisk | null;
  flood: FloodRisk | null;
  catNatEvents: CatNatEvent[];
  available: boolean;
  note: string;
}

export interface SocialHousingSnapshot {
  year: number;
  totalUnits: number | null;
  occupiedUnits: number | null;
  vacantUnits: number | null;
  totalDwellings: number | null;
  socialHousingSharePercent: number | null;
  vacancyRatePercent: number | null;
  available: boolean;
  note: string;
}

export interface IrveSnapshot {
  year: number;
  chargingPoints: number;
  stations: number;
  available: boolean;
  note: string;
}

export interface LocalTaxSnapshot {
  year: number;
  propertyTaxBuiltRate: number | null;
  propertyTaxUnbuiltRate: number | null;
  habitationTaxRate: number | null;
  available: boolean;
  note: string;
}

export interface AttractionAreaSnapshot {
  code: string;
  label: string;
  categoryCode: string;
  categoryLabel: string;
  available: boolean;
  note: string;
}

export interface EpciComparisonSnapshot {
  epciName: string;
  communeCount: number;
  communeRankByPopulation: number | null;
  communeRankByDensity: number | null;
  epciAveragePopulation: number | null;
  epciAverageDensity: number | null;
  available: boolean;
  note: string;
}

export interface GeographySnapshot {
  attractionArea: AttractionAreaSnapshot | null;
  epciComparison: EpciComparisonSnapshot | null;
}

export interface PropertyYearPrice {
  year: number;
  averagePricePerM2: number | null;
  mutationCount: number | null;
}

export interface PropertyMarketSnapshot {
  year: number;
  averagePricePerM2: number | null;
  averageTransactionPrice: number | null;
  mutationCount: number | null;
  houseMutations: number | null;
  apartmentMutations: number | null;
  houseSharePercent: number | null;
  apartmentSharePercent: number | null;
  priceHistory: PropertyYearPrice[];
  departmentCode: string | null;
  departmentAveragePricePerM2: number | null;
  available: boolean;
  note: string;
}

export interface DerivedIndicatorsSnapshot {
  populationGrowthPercent: number | null;
  populationGrowthFromYear: number | null;
  populationGrowthToYear: number | null;
  irvePointsPer1000Residents: number | null;
  socialHousingVacancyRatePercent: number | null;
  equipmentsPer1000Residents: number | null;
  available: boolean;
  note: string;
}

export interface TerritoryEnrichment {
  populationHistory: PopulationHistorySnapshot | null;
  sociodemographics: SociodemographicsSnapshot | null;
  enterprises: EnterpriseSnapshot | null;
  equipments: EquipmentSnapshot | null;
  risks: RisksSnapshot | null;
  housing: SocialHousingSnapshot | null;
  mobility: IrveSnapshot | null;
  fiscal: LocalTaxSnapshot | null;
  geography: GeographySnapshot | null;
  property: PropertyMarketSnapshot | null;
  derived: DerivedIndicatorsSnapshot | null;
  sources: DataSource[];
}

export interface SociodemographicsCommuneCacheEntry {
  year: number;
  ageBands: Record<string, number>;
  unemploymentRate: number | null;
  medianDisposableIncome: number | null;
}

export type SociodemographicsCommuneCache = Record<
  string,
  SociodemographicsCommuneCacheEntry
>;

export type BpeTypeLabels = Record<string, string>;

export interface TerritoryProfile {
  name: string;
  inseeCode: string;
  postalCodes: string[];
  department: TerritoryDepartment | null;
  region: TerritoryRegion | null;
  epci: TerritoryEpci | null;
  population: number | null;
  densityPerKm2: number | null;
  coordinates: TerritoryCoordinates | null;
  surfaceKm2: number | null;
  sources: DataSource[];
  enrichment: TerritoryEnrichment | null;
}

export interface TerritoryAnalysis {
  summary: string;
  strengths: string[];
  watchPoints: string[];
  opportunities: string[];
  dataLimits: string[];
}

export interface AnalysisResult {
  analysis: TerritoryAnalysis | null;
  configured: boolean;
  error?: string;
}

export interface CommuneSearchResult {
  query: string;
  matches: TerritoryProfile[];
  resolved: TerritoryProfile | null;
}

export interface GeoApiCommune {
  nom: string;
  code: string;
  codesPostaux?: string[];
  population?: number;
  surface?: number;
  centre?: {
    coordinates: [number, number];
  };
  departement?: {
    code: string;
    nom: string;
  };
  region?: {
    code: string;
    nom: string;
  };
  epci?: {
    code: string;
    nom: string;
  };
  codeDepartement?: string;
  codeRegion?: string;
}

export interface BpeCommuneCacheEntry {
  year: number;
  total: number;
  byDomain: Record<string, number>;
  byType: Record<string, number>;
}

export type BpeCommuneCache = Record<string, BpeCommuneCacheEntry>;

export interface PopulationCommuneCacheEntry {
  history: Record<string, number>;
}

export type PopulationCommuneCache = Record<string, PopulationCommuneCacheEntry>;

export interface HousingCommuneCacheEntry {
  year: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalDwellings: number | null;
}

export type HousingCommuneCache = Record<string, HousingCommuneCacheEntry>;

export interface IrveCommuneCacheEntry {
  year: number;
  chargingPoints: number;
  stations: number;
}

export type IrveCommuneCache = Record<string, IrveCommuneCacheEntry>;

export interface FiscalCommuneCacheEntry {
  year: number;
  propertyTaxBuiltRate: number | null;
  propertyTaxUnbuiltRate: number | null;
  habitationTaxRate: number | null;
}

export type FiscalCommuneCache = Record<string, FiscalCommuneCacheEntry>;

export interface GeographyCommuneCacheEntry {
  aavCode: string;
  aavLabel: string;
  categoryCode: string;
  categoryLabel: string;
}

export type GeographyCommuneCache = Record<string, GeographyCommuneCacheEntry>;

export interface PropertyCommuneCacheEntry {
  year: number;
  averagePricePerM2: number | null;
  averageTransactionPrice: number | null;
  mutationCount: number | null;
  houseMutations: number | null;
  apartmentMutations: number | null;
  houseSharePercent: number | null;
  apartmentSharePercent: number | null;
  priceHistory: PropertyYearPrice[];
  departmentCode: string;
  departmentAveragePricePerM2: number | null;
}

export type PropertyCommuneCache = Record<string, PropertyCommuneCacheEntry>;
