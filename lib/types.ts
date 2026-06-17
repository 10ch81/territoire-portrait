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

export interface TerritoryCoordinates {
  latitude: number;
  longitude: number;
}

export interface TerritoryProfile {
  name: string;
  inseeCode: string;
  postalCodes: string[];
  department: TerritoryDepartment | null;
  region: TerritoryRegion | null;
  population: number | null;
  coordinates: TerritoryCoordinates | null;
  surfaceKm2: number | null;
  sources: DataSource[];
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
  codeDepartement?: string;
  codeRegion?: string;
}
