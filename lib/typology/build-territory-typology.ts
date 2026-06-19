import type { AttractionAreaSnapshot, TerritoryProfile } from "../types";
import {
  loadTypologyCacheEntry,
  mapAavSnapshot,
  mapCacheToDensityGrid,
  mapCacheToPublicPolicy,
  mapCacheToUrbanUnit,
} from "../enrichment/typology-loaders";
import { deriveComparisonProfile } from "./comparison-profile";
import { buildSummaryLabel } from "./summary-label";
import type { TerritoryTypology, TypologyFamilyId } from "./types";

export type TypologyBuildContext = {
  territory: TerritoryProfile;
  geographyAav?: AttractionAreaSnapshot | null;
  prebuilt?: TerritoryTypology;
};

const ALL_FAMILIES: TypologyFamilyId[] = [
  "density_grid",
  "attraction_area",
  "urban_unit",
  "public_policy",
];

function resolveFamilies(snapshots: {
  densityGrid: TerritoryTypology["densityGrid"];
  attractionArea: TerritoryTypology["attractionArea"];
  urbanUnit: TerritoryTypology["urbanUnit"];
  publicPolicyTypologies: TerritoryTypology["publicPolicyTypologies"];
}): { availableFamilies: string[]; missingFamilies: string[] } {
  const available: string[] = [];
  const missing: string[] = [];

  if (snapshots.densityGrid?.available) {
    available.push("density_grid");
  } else {
    missing.push("density_grid");
  }

  if (snapshots.attractionArea?.available) {
    available.push("attraction_area");
  } else {
    missing.push("attraction_area");
  }

  if (snapshots.urbanUnit?.available) {
    available.push("urban_unit");
  } else {
    missing.push("urban_unit");
  }

  if (snapshots.publicPolicyTypologies?.available) {
    available.push("public_policy");
  } else {
    missing.push("public_policy");
  }

  return { availableFamilies: available, missingFamilies: missing };
}

export function buildTerritoryTypology(context: TypologyBuildContext): TerritoryTypology {
  const { territory, geographyAav, prebuilt } = context;

  if (prebuilt) {
    return prebuilt;
  }

  if (territory.enrichment?.territoryTypology) {
    return territory.enrichment.territoryTypology;
  }

  const entry = loadTypologyCacheEntry(territory.inseeCode);

  const densityGrid = mapCacheToDensityGrid(entry);
  const urbanUnit = mapCacheToUrbanUnit(entry);
  const publicPolicyTypologies = mapCacheToPublicPolicy(entry);
  const attractionArea = mapAavSnapshot(
    geographyAav ?? territory.enrichment?.geography?.attractionArea,
  );

  const comparisonProfile = deriveComparisonProfile({
    population: territory.population,
    densityGrid,
    attractionArea,
    urbanUnit,
  });

  const summaryLabel = buildSummaryLabel({
    comparisonProfile,
    densityGrid,
    attractionArea,
    urbanUnit,
    publicPolicyTypologies,
  });

  const families = resolveFamilies({
    densityGrid,
    attractionArea,
    urbanUnit,
    publicPolicyTypologies,
  });

  return {
    densityGrid,
    attractionArea,
    urbanUnit,
    publicPolicyTypologies,
    summaryLabel,
    comparisonProfile,
    ...families,
  };
}

export function isTypologyFamilyAvailable(
  typology: TerritoryTypology | null | undefined,
  family: TypologyFamilyId,
): boolean {
  return typology?.availableFamilies.includes(family) ?? false;
}

export { ALL_FAMILIES };
