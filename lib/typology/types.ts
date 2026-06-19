export type ComparisonProfile =
  | "metropole"
  | "grande_ville"
  | "ville_moyenne"
  | "petite_centralite"
  | "periurbain"
  | "rural"
  | "rural_isole"
  | "unknown";

export type AttractionAreaRole = "pole" | "couronne" | "hors_attraction" | "unknown";

export type UrbanUnitRole =
  | "ville_centre"
  | "banlieue"
  | "commune_isolee"
  | "unknown";

export type TypologySourceName = "INSEE" | "ANCT" | "DGCL";

export type DensityGridSnapshot = {
  levelCode?: string;
  levelLabel?: string;
  simplifiedLabel?: string;
  source: TypologySourceName;
  vintage?: number;
  available: boolean;
  note: string;
};

export type AttractionAreaTypologySnapshot = {
  areaCode?: string;
  areaLabel?: string;
  role?: AttractionAreaRole;
  categoryCode?: string;
  categoryLabel?: string;
  sizeClass?: string;
  source: TypologySourceName;
  vintage?: number;
  available: boolean;
  note: string;
};

export type UrbanUnitTypologySnapshot = {
  unitCode?: string;
  unitLabel?: string;
  belongsToUrbanUnit?: boolean;
  role?: UrbanUnitRole;
  sizeClass?: string;
  source: TypologySourceName;
  vintage?: number;
  available: boolean;
  note: string;
};

export type PublicPolicyTypologiesSnapshot = {
  petitesVillesDeDemain?: boolean;
  actionCoeurDeVille?: boolean;
  franceRuralitesRevitalisation?: boolean;
  franceRuralitesRevitalisationPlus?: boolean;
  villagesAvenir?: boolean;
  source: TypologySourceName;
  vintage?: number;
  available: boolean;
  note: string;
};

export type TerritoryTypology = {
  densityGrid?: DensityGridSnapshot;
  attractionArea?: AttractionAreaTypologySnapshot;
  urbanUnit?: UrbanUnitTypologySnapshot;
  publicPolicyTypologies?: PublicPolicyTypologiesSnapshot;
  summaryLabel?: string;
  comparisonProfile: ComparisonProfile;
  availableFamilies: string[];
  missingFamilies: string[];
};

export type TypologyFamilyId =
  | "density_grid"
  | "attraction_area"
  | "urban_unit"
  | "public_policy";

export type TypologyCommuneCacheEntry = {
  densityGrid?: {
    levelCode: string;
    levelLabel: string;
    simplifiedLabel: string;
    vintage: number;
  };
  urbanUnit?: {
    unitCode: string;
    unitLabel: string;
    roleCode: string;
    sizeClass: string;
    vintage: number;
  };
  publicPolicy?: {
    petitesVillesDeDemain: boolean;
    actionCoeurDeVille: boolean;
    franceRuralitesRevitalisation: boolean;
    franceRuralitesRevitalisationPlus: boolean;
    villagesAvenir: boolean;
    vintage: number;
  };
};

export type TypologyCommuneCache = Record<string, TypologyCommuneCacheEntry>;
