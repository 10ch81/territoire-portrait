import type { AttractionAreaRole } from "./types";

/** Libellés INSEE — grille communale de densité à 7 niveaux (millésime 2024). Niveau 1 = le plus dense. */
export const DENSITY_GRID_LABELS: Record<string, string> = {
  "1": "Grand centre urbain",
  "2": "Centre urbain intermédiaire",
  "3": "Petite ville",
  "4": "Ceinture urbaine",
  "5": "Bourg rural",
  "6": "Rural à habitat dispersé",
  "7": "Rural à habitat très dispersé",
};

/** Libellés simplifiés pour le résumé (sans jargon INSEE). */
export const DENSITY_GRID_SIMPLIFIED: Record<string, string> = {
  "1": "commune très dense",
  "2": "commune dense",
  "3": "commune urbaine",
  "4": "commune périurbaine",
  "5": "commune rurale semi-dense",
  "6": "commune rurale peu dense",
  "7": "commune rurale très peu dense",
};

/** Rôle communal dans l'aire d'attraction (AAV2020, catégories 11–13, 20, 30). */
export const AAV_CATEGORY_ROLE: Record<string, AttractionAreaRole> = {
  "11": "pole",
  "12": "pole",
  "13": "pole",
  "20": "couronne",
  "30": "hors_attraction",
};

export function aavRoleFromCategoryCode(
  categoryCode: string | undefined,
): AttractionAreaRole {
  if (!categoryCode) {
    return "unknown";
  }

  return AAV_CATEGORY_ROLE[categoryCode] ?? "unknown";
}

export function isAavCommuneCentre(categoryCode: string | undefined): boolean {
  return categoryCode === "11";
}

/** Type communal dans l'unité urbaine 2020 (TUUCOM). */
export const UU_ROLE_FROM_CODE: Record<string, import("./types").UrbanUnitRole> = {
  C: "ville_centre",
  B: "banlieue",
  I: "banlieue",
  H: "commune_isolee",
};

export const TYPOLOGY_FAMILY_LABELS: Record<
  import("./types").TypologyFamilyId,
  string
> = {
  density_grid: "Grille communale de densité INSEE",
  attraction_area: "Aire d'attraction des villes (AAV2020)",
  urban_unit: "Unité urbaine 2020",
  public_policy: "Dispositifs publics nationaux (ANCT / DGCL)",
};
