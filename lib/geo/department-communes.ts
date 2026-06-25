const GEO_API_BASE = "https://geo.api.gouv.fr";

export interface GeoApiDepartmentCommune {
  nom: string;
  code: string;
  population?: number;
  surface?: number;
}

export async function fetchDepartmentCommunes(
  departmentCode: string,
  options?: { includeSurface?: boolean },
): Promise<GeoApiDepartmentCommune[]> {
  const fields = options?.includeSurface
    ? "nom,code,population,surface"
    : "nom,code,population";

  try {
    const response = await fetch(
      `${GEO_API_BASE}/departements/${encodeURIComponent(departmentCode)}/communes?fields=${fields}&format=json`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      },
    );

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as GeoApiDepartmentCommune[];
  } catch (error) {
    console.error("Erreur API Géo département:", error);
    return [];
  }
}

export async function fetchAllDepartmentCodes(): Promise<string[]> {
  const response = await fetch(
    `${GEO_API_BASE}/departements?fields=code&format=json`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(`Liste des départements inaccessible (statut ${response.status}).`);
  }

  const departments = (await response.json()) as Array<{ code: string }>;
  return departments.map((item) => item.code).sort();
}
