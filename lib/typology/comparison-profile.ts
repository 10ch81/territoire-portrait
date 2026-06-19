import {
  aavRoleFromCategoryCode,
  isAavCommuneCentre,
} from "./labels";
import type {
  AttractionAreaTypologySnapshot,
  ComparisonProfile,
  DensityGridSnapshot,
  UrbanUnitTypologySnapshot,
} from "./types";

/** Seuil population — grande agglomération (habitants, AAV centre). */
export const METROPOLE_POPULATION_THRESHOLD = 200_000;

/** Seuil population — grande ville (habitants, AAV centre). */
export const GRANDE_VILLE_POPULATION_THRESHOLD = 50_000;

/** Seuil population — ville moyenne (habitants, AAV centre). */
export const VILLE_MOYENNE_POPULATION_THRESHOLD = 20_000;

/** Seuil taille UU — métropole (classe INSEE ≥ 6 : ≥ 100 000 hab. dans l'UU). */
export const METROPOLE_UU_SIZE_CLASS_MIN = 6;

/** Seuil taille UU — grande agglomération (classe INSEE ≥ 4 : ≥ 10 000 hab.). */
export const GRANDE_UU_SIZE_CLASS_MIN = 4;

function densityLevelCode(snapshot: DensityGridSnapshot | undefined): number | null {
  const code = snapshot?.levelCode;
  if (!code) return null;
  const parsed = Number.parseInt(code, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function uuSizeClass(snapshot: UrbanUnitTypologySnapshot | undefined): number | null {
  const code = snapshot?.sizeClass;
  if (!code || code === "0") return null;
  const parsed = Number.parseInt(code, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function deriveComparisonProfile(input: {
  population: number | null;
  densityGrid?: DensityGridSnapshot;
  attractionArea?: AttractionAreaTypologySnapshot;
  urbanUnit?: UrbanUnitTypologySnapshot;
}): ComparisonProfile {
  const densityLevel = densityLevelCode(input.densityGrid);
  const aavRole =
    input.attractionArea?.role ??
    aavRoleFromCategoryCode(input.attractionArea?.categoryCode);
  const aavCat = input.attractionArea?.categoryCode;
  const uuSize = uuSizeClass(input.urbanUnit);
  const uuRole = input.urbanUnit?.role;
  const inUrbanUnit = input.urbanUnit?.belongsToUrbanUnit === true;
  const population = input.population;

  if (aavRole === "hors_attraction" || aavCat === "30") {
    if (densityLevel !== null && densityLevel >= 6) {
      return "rural_isole";
    }
    return "rural";
  }

  if (aavRole === "couronne" || aavCat === "20") {
    return "periurbain";
  }

  if (aavRole === "pole") {
    if (
      (uuSize !== null && uuSize >= METROPOLE_UU_SIZE_CLASS_MIN) ||
      densityLevel === 1 ||
      (population !== null && population >= METROPOLE_POPULATION_THRESHOLD)
    ) {
      return "metropole";
    }

    if (
      (uuSize !== null && uuSize >= GRANDE_UU_SIZE_CLASS_MIN) ||
      (population !== null && population >= GRANDE_VILLE_POPULATION_THRESHOLD) ||
      (densityLevel !== null &&
        densityLevel <= 2 &&
        population !== null &&
        population >= GRANDE_VILLE_POPULATION_THRESHOLD)
    ) {
      return "grande_ville";
    }

    if (population !== null && population >= VILLE_MOYENNE_POPULATION_THRESHOLD) {
      return "ville_moyenne";
    }

    if (uuRole === "ville_centre" || isAavCommuneCentre(aavCat)) {
      return "petite_centralite";
    }

    return "ville_moyenne";
  }

  if (densityLevel !== null && densityLevel >= 6 && !inUrbanUnit) {
    return uuRole === "commune_isolee" ? "rural_isole" : "rural";
  }

  if (densityLevel !== null && densityLevel >= 5) {
    return "rural";
  }

  if (inUrbanUnit && uuRole === "banlieue") {
    return "periurbain";
  }

  return "unknown";
}
