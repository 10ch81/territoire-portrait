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
  legalUnitsIsCapped: boolean;
  essCount: number | null;
  rgeCount: number | null;
  inseeLegalUnits: number | null;
  inseeEstablishments: number | null;
  inseeSideYear: number | null;
  millesime: string;
  /** Avertissement si SIRENE API et SIDE INSEE divergent fortement. */
  divergenceWarning: string | null;
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
  domainBreakdownLabel: string;
  topTypesLabel: string;
  qualitativeSummary: string;
  domainCountsAreTypeCounts: boolean;
}

export interface AgeBandCount {
  label: string;
  population: number;
  sharePercent: number | null;
}

export interface SociodemographicsSnapshot {
  year: number;
  /** Millésime FILOSOFI du revenu / niveau de vie médian (distinct du RP). */
  incomeYear: number | null;
  ageBands: AgeBandCount[];
  unemploymentRate: number | null;
  medianDisposableIncome: number | null;
  available: boolean;
  note: string;
}

export interface LabourMarketSnapshot {
  quarter: string | null;
  totalJobSeekers: number | null;
  categoryA: number | null;
  under25: number | null;
  age50AndOver: number | null;
  longTerm: number | null;
  available: boolean;
  note: string;
}

export interface SocialBenefitsSnapshot {
  rsaVintage: number | null;
  rsaShareAmongHouseholdsPercent: number | null;
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
  rpVacantDwellings: number | null;
  rpVacancyRatePercent: number | null;
  socialHousingSharePercent: number | null;
  vacancyRatePercent: number | null;
  primaryResidences: number | null;
  ownerOccupiedPrimarySharePercent: number | null;
  secondaryResidenceSharePercent: number | null;
  lovacVintage: number | null;
  privateVacantDwellings: number | null;
  privateVacancyRatePercent: number | null;
  privateVacantStructural: number | null;
  lovacNote: string | null;
  available: boolean;
  note: string;
}

export interface CommuteSnapshot {
  year: number;
  employedCount: number | null;
  carSharePercent: number | null;
  publicTransportSharePercent: number | null;
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

export interface ConnectivitySnapshot {
  vintage: string;
  fiberEligibleSharePercent: number | null;
  totalPremises: number | null;
  fiberEligiblePremises: number | null;
  technologies: string[];
  available: boolean;
  note: string;
}

export interface MobilitySnapshot {
  irve: IrveSnapshot;
  commute: CommuteSnapshot;
  connectivity: ConnectivitySnapshot;
}

export interface EmploymentSectorCount {
  code: string;
  label: string;
  establishments: number;
  salariedPosts: number;
}

export interface EmploymentSectorsSnapshot {
  year: number;
  totalEstablishments: number;
  totalSalariedPosts: number;
  sectors: EmploymentSectorCount[];
  available: boolean;
  note: string;
}

export interface HealthCategoryCount {
  code: string;
  label: string;
  count: number;
}

export interface HealthSnapshot {
  year: number;
  totalEstablishments: number;
  totalCapacity: number | null;
  byCategory: HealthCategoryCount[];
  byType: HealthCategoryCount[];
  available: boolean;
  note: string;
}

export interface EducationAggregateCount {
  code: string;
  label: string;
  count: number;
}

export interface EducationSnapshot {
  year: number;
  totalOpen: number;
  byType: EducationAggregateCount[];
  bySector: EducationAggregateCount[];
  byLevel: EducationAggregateCount[];
  ipsSchoolYear: string | null;
  averageIps: number | null;
  schoolsWithIps: number | null;
  ipsMin: number | null;
  ipsMax: number | null;
  ipsNote: string | null;
  available: boolean;
  note: string;
}

export interface QpvSnapshot {
  year: number;
  hasQpv: boolean;
  qpvCount: number;
  qpvLabels: string[];
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

export interface PublicAccountsSnapshot {
  year: number;
  operatingRevenueEur: number | null;
  operatingRevenuePerCapitaEur: number | null;
  debtOutstandingEur: number | null;
  debtPerCapitaEur: number | null;
  grossSavingsEur: number | null;
  grossSavingsPerCapitaEur: number | null;
  debtServiceEur: number | null;
  debtServicePerCapitaEur: number | null;
  available: boolean;
  note: string;
}

export interface ProximityServicesSnapshot {
  year: number;
  franceServicesCount: number;
  structureLabels: string[];
  available: boolean;
  note: string;
}

export interface TourismSnapshot {
  year: number;
  accommodationPlaces: number;
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
  /** LOVAC − RP (points de pourcentage) lorsque les deux taux sont disponibles. */
  lovacRpVacancySpreadPercent: number | null;
  /** Prix m² communal DVF / prix m² département. */
  realEstatePremiumRatio: number | null;
  available: boolean;
  note: string;
}

export interface SecurityIndicatorSnapshot {
  id: string;
  label: string;
  count: number | null;
  ratePer1000: number | null;
  departmentRatePer1000: number | null;
  diffused: boolean;
}

export interface SecuritySnapshot {
  year: number;
  indicators: SecurityIndicatorSnapshot[];
  diffusedIndicatorCount: number;
  available: boolean;
  note: string;
}

export interface TerritoryEnrichment {
  populationHistory: PopulationHistorySnapshot | null;
  sociodemographics: SociodemographicsSnapshot | null;
  labourMarket: LabourMarketSnapshot | null;
  socialBenefits: SocialBenefitsSnapshot | null;
  enterprises: EnterpriseSnapshot | null;
  employmentSectors: EmploymentSectorsSnapshot | null;
  equipments: EquipmentSnapshot | null;
  education: EducationSnapshot | null;
  health: HealthSnapshot | null;
  risks: RisksSnapshot | null;
  security: SecuritySnapshot | null;
  housing: SocialHousingSnapshot | null;
  mobility: MobilitySnapshot | null;
  urbanPolicy: QpvSnapshot | null;
  fiscal: LocalTaxSnapshot | null;
  publicAccounts: PublicAccountsSnapshot | null;
  proximityServices: ProximityServicesSnapshot | null;
  tourism: TourismSnapshot | null;
  geography: GeographySnapshot | null;
  property: PropertyMarketSnapshot | null;
  derived: DerivedIndicatorsSnapshot | null;
  territoryTypology: import("./typology/types").TerritoryTypology | null;
  sources: DataSource[];
}

export interface SociodemographicsCommuneCacheEntry {
  year: number;
  incomeYear: number | null;
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

export type EditorialProfileId =
  | "largeUrbanCenter"
  | "growthEpciCentrality"
  | "mountainTourismCenter"
  | "smallPeriurbanGrowth"
  | "employmentPole"
  | "ruralDecline"
  | "socialFragilityUrban"
  | "genericCentralite";

export interface EditorialAnalysisOutput {
  profileId: EditorialProfileId;
  summary: string;
  strengths: string[];
  watchPoints: string[];
  opportunities: string[];
}

export interface TerritoryAnalysis {
  summary: string;
  strengths: string[];
  watchPoints: string[];
  opportunities: string[];
  dataLimits: string[];
  /** Couche éditoriale v2 — rendu principal côté UI lorsqu'elle est disponible. */
  editorial?: EditorialAnalysisOutput;
}

export interface AnalysisResult {
  analysis: TerritoryAnalysis | null;
  configured: boolean;
  /** true si la sortie provient d'un appel Mistral réussi. */
  llmUsed?: boolean;
  /** true si la sortie est la version canonique serveur (sans LLM ou après échec Mistral). */
  degraded?: boolean;
  error?: string;
}

export interface AddressSearchMatch {
  label: string;
  inseeCode: string;
  communeName: string;
  postalCode: string;
  score: number;
}

export interface CommuneSearchResult {
  query: string;
  matches: TerritoryProfile[];
  resolved: TerritoryProfile | null;
  addressMatches: AddressSearchMatch[];
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
  rpVacantDwellings: number | null;
  rpVacancyRatePercent: number | null;
  primaryResidences: number | null;
  ownerOccupiedPrimarySharePercent: number | null;
  secondaryResidenceSharePercent: number | null;
}

export interface CommuteCommuneCacheEntry {
  year: number;
  employedCount: number;
  carSharePercent: number | null;
  publicTransportSharePercent: number | null;
}

export type CommuteCommuneCache = Record<string, CommuteCommuneCacheEntry>;

export interface QpvCommuneCacheEntry {
  year: number;
  qpvLabels: string[];
}

export type QpvCommuneCache = Record<string, QpvCommuneCacheEntry>;

export type HousingCommuneCache = Record<string, HousingCommuneCacheEntry>;

export interface LovacCommuneCacheEntry {
  vintage: number;
  privateTotalDwellings: number | null;
  privateVacantDwellings: number | null;
  privateVacantStructural: number | null;
  privateVacancyRatePercent: number | null;
  suppressed: boolean;
}

export type LovacCommuneCache = Record<string, LovacCommuneCacheEntry>;

export interface FranceTravailCommuneCacheEntry {
  quarter: string;
  totalJobSeekers: number | null;
  categoryA: number | null;
  under25: number | null;
  age50AndOver: number | null;
  longTerm: number | null;
}

export type FranceTravailCommuneCache = Record<
  string,
  FranceTravailCommuneCacheEntry
>;

export interface CafCommuneCacheEntry {
  rsaShareAmongHouseholdsPercent: number | null;
  vintage: number;
}

export type CafCommuneCache = Record<string, CafCommuneCacheEntry>;

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

export interface EnterpriseSideCommuneCacheEntry {
  year: number;
  legalUnits: number;
  establishments: number;
}

export type EnterpriseSideCommuneCache = Record<
  string,
  EnterpriseSideCommuneCacheEntry
>;

export interface ProximityServicesCommuneCacheEntry {
  year: number;
  count: number;
  labels: string[];
}

export type ProximityServicesCommuneCache = Record<
  string,
  ProximityServicesCommuneCacheEntry
>;

export interface TourismCommuneCacheEntry {
  year: number;
  accommodationPlaces: number;
}

export type TourismCommuneCache = Record<string, TourismCommuneCacheEntry>;

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

export interface SecurityIndicatorCacheEntry {
  count: number | null;
  ratePer1000: number | null;
  diffused: boolean;
}

export interface SecurityCommuneCacheEntry {
  year: number;
  departmentCode: string;
  indicators: Record<string, SecurityIndicatorCacheEntry>;
}

export type SecurityCommuneCache = Record<string, SecurityCommuneCacheEntry>;

export interface SecurityDepartmentCacheEntry {
  year: number;
  indicators: Record<string, SecurityIndicatorCacheEntry>;
}

export type SecurityDepartmentCache = Record<string, SecurityDepartmentCacheEntry>;

export interface FloresSectorCacheEntry {
  establishments: number;
  salariedPosts: number;
}

export interface FloresCommuneCacheEntry {
  year: number;
  totalEstablishments: number;
  totalSalariedPosts: number;
  sectors: Record<string, FloresSectorCacheEntry>;
}

export type FloresCommuneCache = Record<string, FloresCommuneCacheEntry>;

export interface ArcepCommuneCacheEntry {
  vintage: string;
  totalPremises: number;
  fiberEligiblePremises: number;
  fiberEligibleSharePercent: number | null;
  technologies: string[];
}

export type ArcepCommuneCache = Record<string, ArcepCommuneCacheEntry>;

export interface FinessCommuneCacheEntry {
  year: number;
  total: number;
  totalCapacity: number | null;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
}

export type FinessCommuneCache = Record<string, FinessCommuneCacheEntry>;

export interface EducationCommuneCacheEntry {
  year: number;
  totalOpen: number;
  byType: Record<string, number>;
  bySector: Record<string, number>;
  byLevel: Record<string, number>;
}

export type EducationCommuneCache = Record<string, EducationCommuneCacheEntry>;

export interface IpsCommuneCacheEntry {
  schoolYear: string;
  averageIps: number;
  schoolsWithIps: number;
  ipsMin: number;
  ipsMax: number;
}

export type IpsCommuneCache = Record<string, IpsCommuneCacheEntry>;
