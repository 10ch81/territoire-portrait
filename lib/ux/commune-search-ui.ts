import type { AddressSearchMatch, CommuneSearchResult, TerritoryProfile } from "@/lib/types";

export interface CommuneSearchSuggestion {
  key: string;
  inseeCode: string;
  title: string;
  subtitle: string;
  kind: "commune" | "address";
}

export function formatCommuneSearchMeta(match: TerritoryProfile): string {
  const parts = [`INSEE ${match.inseeCode}`];
  if (match.postalCodes[0]) {
    parts.push(match.postalCodes[0]);
  }
  if (match.department) {
    parts.push(`${match.department.name} (${match.department.code})`);
  }
  if (match.population != null) {
    parts.push(`${new Intl.NumberFormat("fr-FR").format(match.population)} hab.`);
  }
  return parts.join(" · ");
}

function communeToSuggestion(match: TerritoryProfile): CommuneSearchSuggestion {
  return {
    key: `commune-${match.inseeCode}`,
    inseeCode: match.inseeCode,
    title: match.name,
    subtitle: formatCommuneSearchMeta(match),
    kind: "commune",
  };
}

function addressToSuggestion(match: AddressSearchMatch): CommuneSearchSuggestion {
  return {
    key: `address-${match.inseeCode}-${match.label}`,
    inseeCode: match.inseeCode,
    title: match.label,
    subtitle: `Commune de ${match.communeName}${match.postalCode ? ` (${match.postalCode})` : ""} · INSEE ${match.inseeCode}`,
    kind: "address",
  };
}

export function buildCommuneSearchSuggestions(
  result: CommuneSearchResult,
  limit = 8,
): CommuneSearchSuggestion[] {
  if (result.resolved) {
    return [communeToSuggestion(result.resolved)];
  }

  const suggestions: CommuneSearchSuggestion[] = [];
  for (const match of result.matches.slice(0, limit)) {
    suggestions.push(communeToSuggestion(match));
  }

  const remaining = limit - suggestions.length;
  if (remaining > 0) {
    for (const address of (result.addressMatches ?? []).slice(0, remaining)) {
      suggestions.push(addressToSuggestion(address));
    }
  }

  return suggestions;
}

export function communeNameFromSearchSuggestion(
  suggestion: CommuneSearchSuggestion,
): string {
  if (suggestion.kind === "commune") {
    return suggestion.title;
  }

  const prefix = "Commune de ";
  const idx = suggestion.subtitle.indexOf(prefix);
  if (idx === -1) {
    return suggestion.title;
  }

  const rest = suggestion.subtitle.slice(idx + prefix.length);
  const end = rest.search(/ ·|\(/);
  return end === -1 ? rest.trim() : rest.slice(0, end).trim();
}

export function pickCommuneSearchInsee(result: CommuneSearchResult): string | null {
  if (result.resolved) {
    return result.resolved.inseeCode;
  }
  if (result.matches[0]) {
    return result.matches[0].inseeCode;
  }
  if (result.addressMatches?.[0]) {
    return result.addressMatches[0].inseeCode;
  }
  return null;
}

export function hasCommuneSearchResults(result: CommuneSearchResult): boolean {
  return pickCommuneSearchInsee(result) !== null;
}
