import { getPopulationDisplayMeta } from "../ux/population";
import type { TerritoryProfile } from "../types";
import type { AnalysisFact, AnalysisFactTarget, AnalysisFactTheme } from "./types";
import { formatCount } from "./format";
import { isSelectedFactCovered } from "./ensure-output-coverage";
import {
  buildSummaryPhrase2,
  pickDefaultAssetPhrase,
  resolveAssetPhrase,
  resolveIssueAfterA,
} from "./summary-compose";
import {
  extractDemographySnapshot,
  isFactEligibleForSummary,
  shouldIncludeAsSummaryEnjeu,
} from "./summary-phrases";
import {
  hasSummaryAssetPhrase,
  hasSummaryIssueAfterA,
} from "./summary-fragments";

const SUMMARY_ATOUT_THEMES: AnalysisFactTheme[] = [
  "centrality",
  "equipments",
  "public_services",
  "health",
  "education",
  "connectivity",
  "tourism",
  "economy",
  "employment_sectors",
  "mobility",
  "energy",
  "ess_rge",
];

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3),
  );
  const tokensB = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3),
  );
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }
  return overlap / Math.min(tokensA.size, tokensB.size);
}

function formatEpciAffiliation(epciName: string, departmentName?: string): string {
  const label = departmentName ? `${epciName} (${departmentName})` : epciName;
  if (/^(CC|CA|CU|MET)\b/i.test(epciName) || /^communauté/i.test(epciName)) {
    return `la ${label}`;
  }
  return label;
}

function formatAffiliation(territory: TerritoryProfile): string {
  if (territory.epci?.name) {
    return formatEpciAffiliation(territory.epci.name, territory.department?.name);
  }
  if (territory.department?.name) {
    return `le département ${territory.department.name}`;
  }
  return "son territoire intercommunal";
}

function pickSummaryAtouts(
  facts: AnalysisFact[],
  territory: TerritoryProfile,
): AnalysisFact[] {
  const strengths = facts.filter(
    (fact) =>
      fact.target === "strengths" &&
      isFactEligibleForSummary(fact, territory) &&
      hasSummaryAssetPhrase(fact),
  );

  for (const theme of SUMMARY_ATOUT_THEMES) {
    const fact = strengths.find((candidate) => candidate.theme === theme);
    if (fact) return [fact];
  }

  return strengths.slice(0, 1);
}

function pickSummaryEnjeux(
  facts: AnalysisFact[],
  demography: ReturnType<typeof extractDemographySnapshot>,
): AnalysisFact[] {
  const maxEnjeux = demography.trend === "decline" ? 1 : 2;
  const picks: AnalysisFact[] = [];

  for (const fact of facts) {
    if (fact.target !== "watchPoints") continue;
    if (!shouldIncludeAsSummaryEnjeu(fact)) continue;
    if (!hasSummaryIssueAfterA(fact)) continue;
    picks.push(fact);
    if (picks.length >= maxEnjeux) break;
  }

  return picks;
}

export function buildDeterministicSummary(
  territory: TerritoryProfile,
  selectedFacts: AnalysisFact[],
): string {
  const populationMeta = getPopulationDisplayMeta(territory);
  const name = territory.name || "La commune";
  const affiliation = formatAffiliation(territory);

  const population =
    territory.population !== null
      ? `${formatCount(territory.population)} habitants en ${populationMeta.vintage}`
      : "une population non documentée";

  const density =
    territory.densityPerKm2 !== null
      ? `${formatCount(Math.round(territory.densityPerKm2))} habitants/km²`
      : null;

  const phrase1 = density
    ? `${name}, commune de ${population}, appartient à ${affiliation} et présente une densité de ${density}.`
    : `${name}, commune de ${population}, appartient à ${affiliation}.`;

  const demography = extractDemographySnapshot(territory, selectedFacts);
  const assetFact = pickSummaryAtouts(selectedFacts, territory)[0];
  const assetPhrase = assetFact ? resolveAssetPhrase(assetFact) : null;
  const issueAfterA = pickSummaryEnjeux(selectedFacts, demography)
    .map(resolveIssueAfterA)
    .filter((phrase): phrase is string => phrase !== null);

  const phrase2 = buildSummaryPhrase2(
    assetPhrase ?? pickDefaultAssetPhrase(),
    demography,
    issueAfterA,
    demography.contextPhrase,
  );

  return `${phrase1} ${phrase2}`;
}

export function buildVerbatimLists(selectedFacts: AnalysisFact[]): {
  strengths: string[];
  watchPoints: string[];
  opportunities: string[];
} {
  return {
    strengths: selectedFacts
      .filter((fact) => fact.target === "strengths")
      .map((fact) => fact.sentence),
    watchPoints: selectedFacts
      .filter((fact) => fact.target === "watchPoints")
      .map((fact) => fact.sentence),
    opportunities: selectedFacts
      .filter((fact) => fact.target === "opportunities")
      .map((fact) => fact.sentence),
  };
}

function factMatchesItem(fact: AnalysisFact, item: string): boolean {
  return (
    tokenOverlap(item, fact.sentence) >= 0.35 ||
    isSelectedFactCovered(fact, [item])
  );
}

export function inferFactOrder(
  mistralItems: string[] | undefined,
  requiredFacts: AnalysisFact[],
): AnalysisFact[] {
  const remaining = [...requiredFacts];
  const ordered: AnalysisFact[] = [];

  for (const item of mistralItems ?? []) {
    const index = remaining.findIndex((fact) => factMatchesItem(fact, item));
    if (index < 0) continue;
    ordered.push(remaining[index]!);
    remaining.splice(index, 1);
  }

  return [...ordered, ...remaining];
}

export function resolveVerbatimList(
  mistralItems: string[] | undefined,
  target: AnalysisFactTarget,
  selectedFacts: AnalysisFact[],
): string[] {
  const required = selectedFacts.filter((fact) => fact.target === target);
  if (required.length === 0) return [];

  return inferFactOrder(mistralItems, required).map((fact) => fact.sentence);
}

export function buildCanonicalAnalysisOutput(
  territory: TerritoryProfile,
  selectedFacts: AnalysisFact[],
): {
  summary: string;
  strengths: string[];
  watchPoints: string[];
  opportunities: string[];
} {
  return {
    summary: buildDeterministicSummary(territory, selectedFacts),
    ...buildVerbatimLists(selectedFacts),
  };
}
