import {
  createGeoApiSource,
  createPopulationSource,
  mergeSources,
} from "./sources";
import type {
  CommuneSearchResult,
  GeoApiCommune,
  TerritoryProfile,
} from "./types";

const GEO_API_BASE = "https://geo.api.gouv.fr";

const COMMUNE_FIELDS = [
  "nom",
  "code",
  "codesPostaux",
  "population",
  "surface",
  "centre",
  "departement",
  "region",
  "epci",
  "codeDepartement",
  "codeRegion",
].join(",");

const INSEE_CODE_PATTERN = /^(\d{5}|2[AB]\d{3})$/i;
const POSTAL_CODE_PATTERN = /^\d{5}$/;

function normalizeQuery(raw: string): string {
  return raw.trim();
}

function isInseeCode(value: string): boolean {
  return INSEE_CODE_PATTERN.test(value);
}

function isPostalCode(value: string): boolean {
  return POSTAL_CODE_PATTERN.test(value);
}

async function fetchGeoApi<T>(path: string): Promise<T | null> {
  const url = `${GEO_API_BASE}${path}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Impossible de contacter l'API Géo (statut ${response.status}).`,
    );
  }

  return (await response.json()) as T;
}

function mapGeoCommuneToProfile(commune: GeoApiCommune): TerritoryProfile {
  const accessedAt = new Date().toISOString();
  const [longitude, latitude] = commune.centre?.coordinates ?? [null, null];
  const surfaceKm2 = commune.surface ? commune.surface / 100 : null;
  const population = commune.population ?? null;
  const densityPerKm2 =
    population !== null && surfaceKm2 !== null && surfaceKm2 > 0
      ? population / surfaceKm2
      : null;

  const baseSources = [createGeoApiSource(accessedAt)];
  if (population !== null) {
    baseSources.push(createPopulationSource(accessedAt));
  }

  return {
    name: commune.nom,
    inseeCode: commune.code,
    postalCodes: commune.codesPostaux ?? [],
    department: commune.departement
      ? { code: commune.departement.code, name: commune.departement.nom }
      : commune.codeDepartement
        ? { code: commune.codeDepartement, name: "Donnée non disponible" }
        : null,
    region: commune.region
      ? { code: commune.region.code, name: commune.region.nom }
      : commune.codeRegion
        ? { code: commune.codeRegion, name: "Donnée non disponible" }
        : null,
    epci: commune.epci
      ? { code: commune.epci.code, name: commune.epci.nom }
      : null,
    population,
    densityPerKm2,
    coordinates:
      latitude !== null && longitude !== null
        ? { latitude, longitude }
        : null,
    surfaceKm2,
    sources: mergeSources(baseSources),
    enrichment: null,
  };
}

async function fetchCommuneByInsee(code: string): Promise<TerritoryProfile | null> {
  const commune = await fetchGeoApi<GeoApiCommune>(
    `/communes/${encodeURIComponent(code)}?fields=${COMMUNE_FIELDS}&format=json&geometry=centre`,
  );

  return commune ? mapGeoCommuneToProfile(commune) : null;
}

async function fetchCommunesByPostalCode(
  postalCode: string,
): Promise<TerritoryProfile[]> {
  const communes = await fetchGeoApi<GeoApiCommune[]>(
    `/communes?codePostal=${encodeURIComponent(postalCode)}&fields=${COMMUNE_FIELDS}&format=json&geometry=centre&limit=20`,
  );

  return (communes ?? []).map(mapGeoCommuneToProfile);
}

async function fetchCommunesByName(name: string): Promise<TerritoryProfile[]> {
  const communes = await fetchGeoApi<GeoApiCommune[]>(
    `/communes?nom=${encodeURIComponent(name)}&fields=${COMMUNE_FIELDS}&format=json&geometry=centre&boost=population&limit=10`,
  );

  return (communes ?? []).map(mapGeoCommuneToProfile);
}

export async function resolveCommuneQuery(
  rawQuery: string,
): Promise<CommuneSearchResult> {
  const query = normalizeQuery(rawQuery);

  if (!query) {
    return { query, matches: [], resolved: null, addressMatches: [] };
  }

  if (isInseeCode(query)) {
    const resolved = await fetchCommuneByInsee(query.toUpperCase());
    return {
      query,
      matches: resolved ? [resolved] : [],
      resolved,
      addressMatches: [],
    };
  }

  if (isPostalCode(query)) {
    const byInsee = await fetchCommuneByInsee(query);
    if (byInsee) {
      return { query, matches: [byInsee], resolved: byInsee, addressMatches: [] };
    }

    const matches = await fetchCommunesByPostalCode(query);
    return {
      query,
      matches,
      resolved: matches.length === 1 ? matches[0] : null,
      addressMatches: [],
    };
  }

  const matches = await fetchCommunesByName(query);
  return {
    query,
    matches,
    resolved: matches.length === 1 ? matches[0] : null,
    addressMatches: [],
  };
}

export async function getTerritoryByInsee(
  codeInsee: string,
): Promise<TerritoryProfile | null> {
  const normalized = normalizeQuery(codeInsee).toUpperCase();

  if (!isInseeCode(normalized)) {
    return null;
  }

  return fetchCommuneByInsee(normalized);
}

export function formatPopulation(population: number | null): string {
  if (population === null) {
    return "Donnée non disponible";
  }

  return new Intl.NumberFormat("fr-FR").format(population);
}

export function formatCoordinates(
  coordinates: TerritoryProfile["coordinates"],
): string {
  if (!coordinates) {
    return "Donnée non disponible";
  }

  return `${coordinates.latitude.toFixed(5)}° N, ${coordinates.longitude.toFixed(5)}° E`;
}

export function formatSurface(surfaceKm2: number | null): string {
  if (surfaceKm2 === null) {
    return "Donnée non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(surfaceKm2)} km²`;
}
