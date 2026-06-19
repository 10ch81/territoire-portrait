import type { AttractionAreaSnapshot, GeographyCommuneCacheEntry, TerritoryProfile } from "../types";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type { TypologyCommuneCache, TypologyCommuneCacheEntry } from "../typology/types";
import {
  AAV_CATEGORY_ROLE,
  DENSITY_GRID_LABELS,
  DENSITY_GRID_SIMPLIFIED,
  UU_ROLE_FROM_CODE,
  aavRoleFromCategoryCode,
} from "../typology/labels";

const TYPOLOGY_CACHE_FILE = "typology-by-commune.json";

export function loadTypologyCacheEntry(inseeCode: string): TypologyCommuneCacheEntry | null {
  if (!isJsonCachePresent(TYPOLOGY_CACHE_FILE)) {
    return null;
  }

  const cache = loadJsonCache<TypologyCommuneCache>(TYPOLOGY_CACHE_FILE);
  return cache?.[inseeCode] ?? null;
}

export function mapGeographyEntryToAav(
  entry: GeographyCommuneCacheEntry | undefined,
): {
  areaCode: string;
  areaLabel: string;
  categoryCode: string;
  categoryLabel: string;
  role: (typeof AAV_CATEGORY_ROLE)[string] | undefined;
} | null {
  if (!entry) {
    return null;
  }

  return {
    areaCode: entry.aavCode,
    areaLabel: entry.aavLabel,
    categoryCode: entry.categoryCode,
    categoryLabel: entry.categoryLabel,
    role: AAV_CATEGORY_ROLE[entry.categoryCode] ?? aavRoleFromCategoryCode(entry.categoryCode),
  };
}

export function mapCacheToDensityGrid(
  entry: TypologyCommuneCacheEntry | null,
): import("../typology/types").DensityGridSnapshot {
  const density = entry?.densityGrid;
  if (!density) {
    return {
      source: "INSEE",
      available: false,
      note: "Grille communale de densité absente. Exécutez « npm run ingest:typology ».",
    };
  }

  return {
    levelCode: density.levelCode,
    levelLabel: density.levelLabel,
    simplifiedLabel: density.simplifiedLabel,
    source: "INSEE",
    vintage: density.vintage,
    available: true,
    note: "Grille communale de densité à 7 niveaux (INSEE, millésime 2024).",
  };
}

export function mapCacheToUrbanUnit(
  entry: TypologyCommuneCacheEntry | null,
): import("../typology/types").UrbanUnitTypologySnapshot {
  const uu = entry?.urbanUnit;
  if (!uu) {
    return {
      source: "INSEE",
      available: false,
      note: "Unité urbaine 2020 absente. Exécutez « npm run ingest:typology ».",
    };
  }

  const belongsToUrbanUnit = uu.roleCode !== "H" && !uu.unitCode.endsWith("000");
  const role = UU_ROLE_FROM_CODE[uu.roleCode] ?? "unknown";

  return {
    unitCode: uu.unitCode,
    unitLabel: uu.unitLabel,
    belongsToUrbanUnit,
    role,
    sizeClass: uu.sizeClass,
    source: "INSEE",
    vintage: uu.vintage,
    available: true,
    note: "Composition communale des unités urbaines 2020 (INSEE).",
  };
}

export function mapCacheToPublicPolicy(
  entry: TypologyCommuneCacheEntry | null,
): import("../typology/types").PublicPolicyTypologiesSnapshot {
  const policy = entry?.publicPolicy;
  if (!policy) {
    return {
      source: "ANCT",
      available: false,
      note:
        "Dispositifs publics nationaux absents. Exécutez « npm run ingest:typology ».",
    };
  }

  return {
    petitesVillesDeDemain: policy.petitesVillesDeDemain,
    actionCoeurDeVille: policy.actionCoeurDeVille,
    franceRuralitesRevitalisation: policy.franceRuralitesRevitalisation,
    franceRuralitesRevitalisationPlus: policy.franceRuralitesRevitalisationPlus,
    villagesAvenir: policy.villagesAvenir,
    source: "ANCT",
    vintage: policy.vintage,
    available: true,
    note: "Programmes Petites villes de demain, Action cœur de ville, FRR et Villages d'avenir.",
  };
}

export function mapAavSnapshot(
  geography: AttractionAreaSnapshot | null | undefined,
): import("../typology/types").AttractionAreaTypologySnapshot {
  if (!geography?.available) {
    return {
      source: "INSEE",
      available: false,
      note: geography?.note ?? "Aire d'attraction des villes non disponible.",
    };
  }

  return {
    areaCode: geography.code,
    areaLabel: geography.label,
    categoryCode: geography.categoryCode,
    categoryLabel: geography.categoryLabel,
    role: AAV_CATEGORY_ROLE[geography.categoryCode] ?? aavRoleFromCategoryCode(geography.categoryCode),
    source: "INSEE",
    vintage: 2020,
    available: true,
    note: "Aire d'attraction des villes 2020 (AAV2020).",
  };
}

export function buildTypologyInputFromTerritory(territory: TerritoryProfile): {
  cacheEntry: TypologyCommuneCacheEntry | null;
  geographyAav: AttractionAreaSnapshot | null | undefined;
} {
  return {
    cacheEntry: loadTypologyCacheEntry(territory.inseeCode),
    geographyAav: territory.enrichment?.geography?.attractionArea,
  };
}

export { DENSITY_GRID_LABELS, DENSITY_GRID_SIMPLIFIED };
