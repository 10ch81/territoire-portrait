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

export interface EquipmentDomainCount {
  code: string;
  label: string;
  count: number;
}

export interface EnterpriseSnapshot {
  legalUnitsWithEstablishment: number | null;
  sampleSize: number;
  topActivitySections: ActivitySectionCount[];
  essCount: number | null;
  millesime: string;
  note: string;
}

export interface EquipmentSnapshot {
  year: number;
  totalEquipments: number;
  byDomain: EquipmentDomainCount[];
  available: boolean;
  note: string;
}

export interface TerritoryEnrichment {
  enterprises: EnterpriseSnapshot | null;
  equipments: EquipmentSnapshot | null;
  sources: DataSource[];
}

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
}

export type BpeCommuneCache = Record<string, BpeCommuneCacheEntry>;
