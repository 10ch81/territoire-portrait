import { resolveCommuneQuery } from "@/lib/territory";
import type { CommuneSearchResult } from "@/lib/types";
import { searchBanAddresses, shouldQueryBanAddresses } from "./ban";

export async function resolveCommuneAndAddressSearch(
  rawQuery: string,
): Promise<CommuneSearchResult> {
  const communeResult = await resolveCommuneQuery(rawQuery);
  const addressMatches = shouldQueryBanAddresses(rawQuery)
    ? await searchBanAddresses(rawQuery, { limit: 5 })
    : [];

  return {
    ...communeResult,
    addressMatches,
  };
}
