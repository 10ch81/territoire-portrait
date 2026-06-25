import type { AddressSearchMatch } from "@/lib/types";

const BAN_API_BASE = "https://api-adresse.data.gouv.fr";
const INSEE_CODE_PATTERN = /^(\d{5}|2[AB]\d{3})$/i;
const MAX_QUERY_LENGTH = 200;

interface BanSearchResponse {
  features?: Array<{
    properties?: {
      label?: string;
      city?: string;
      citycode?: string;
      postcode?: string;
      score?: number;
    };
  }>;
}

export function isValidBanInseeCode(code: string): boolean {
  return INSEE_CODE_PATTERN.test(code.trim());
}

export function shouldQueryBanAddresses(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 3 || trimmed.length > MAX_QUERY_LENGTH) {
    return false;
  }
  if (INSEE_CODE_PATTERN.test(trimmed)) {
    return false;
  }
  return true;
}

export async function searchBanAddresses(
  rawQuery: string,
  options?: { limit?: number },
): Promise<AddressSearchMatch[]> {
  const query = rawQuery.trim();
  if (!shouldQueryBanAddresses(query)) {
    return [];
  }

  const limit = options?.limit ?? 5;
  const url = new URL(`${BAN_API_BASE}/search/`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("autocomplete", "1");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    console.error("Erreur API BAN:", response.status);
    return [];
  }

  const payload = (await response.json()) as BanSearchResponse;
  const matches: AddressSearchMatch[] = [];
  const seen = new Set<string>();

  for (const feature of payload.features ?? []) {
    const properties = feature.properties;
    const label = properties?.label?.trim();
    const inseeCode = properties?.citycode?.trim().toUpperCase() ?? "";
    const communeName = properties?.city?.trim() ?? "";
    const postalCode = properties?.postcode?.trim() ?? "";
    const score = properties?.score ?? 0;

    if (!label || !isValidBanInseeCode(inseeCode) || !communeName) {
      continue;
    }

    const dedupeKey = `${inseeCode}:${label}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    matches.push({
      label,
      inseeCode,
      communeName,
      postalCode,
      score,
    });
  }

  return matches.sort((left, right) => right.score - left.score);
}
