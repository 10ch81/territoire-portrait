import { getPopulationDisplayMeta } from "../ux/population";
import type { TerritoryProfile } from "../types";
import type { AnalysisFact, AnalysisFactTarget, AnalysisFactTheme } from "./types";
import { formatCount } from "./format";
import { isSelectedFactCovered } from "./ensure-output-coverage";

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

function lowercaseFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function stripSourceSuffix(sentence: string): string {
  return sentence.replace(/\s*\([^)]*\)\.?\s*$/g, "").replace(/\.$/, "").trim();
}

function formatAffiliation(territory: TerritoryProfile): string {
  if (territory.epci?.name) {
    const dept = territory.department?.name;
    return dept ? `${territory.epci.name} (${dept})` : territory.epci.name;
  }
  if (territory.department?.name) {
    return `le département ${territory.department.name}`;
  }
  return "son territoire intercommunal";
}

function toSummaryClause(fact: AnalysisFact): string {
  if (fact.theme === "demography") {
    const evolution = fact.sentence.match(
      /(?:la population (?:recule|progresse)|recul|progression)[^.]*(?:entre \d{4} et \d{4})?/i,
    );
    if (evolution) {
      return lowercaseFirst(stripSourceSuffix(evolution[0]));
    }
  }

  let clause = stripSourceSuffix(fact.sentence);
  const ratioSplit = clause.match(/^(.+?),\s*soit environ \d[\d\s]* postes pour 100 habitants/i);
  if (ratioSplit) {
    clause = ratioSplit[1]!;
  }

  if (clause.length > 110) {
    const comma = clause.indexOf(",");
    if (comma > 24) {
      clause = clause.slice(0, comma);
    }
  }

  return lowercaseFirst(clause);
}

function joinSummaryClauses(clauses: string[]): string {
  const cleaned = clauses.filter(Boolean);
  if (cleaned.length === 0) {
    return "peu d'éléments documentés";
  }
  if (cleaned.length === 1) {
    return cleaned[0]!;
  }
  return `${cleaned[0]} et ${cleaned[1]}`;
}

function pickSummaryAtouts(facts: AnalysisFact[]): AnalysisFact[] {
  const strengths = facts.filter((fact) => fact.target === "strengths");
  const picks: AnalysisFact[] = [];

  for (const theme of SUMMARY_ATOUT_THEMES) {
    if (picks.length >= 2) break;
    const fact = strengths.find((candidate) => candidate.theme === theme);
    if (fact) picks.push(fact);
  }

  if (picks.length === 0) {
    return strengths.slice(0, 2);
  }

  return picks.slice(0, 2);
}

function pickSummaryEnjeux(facts: AnalysisFact[]): AnalysisFact[] {
  const picks: AnalysisFact[] = [];
  const demographySummary = facts.find(
    (fact) => fact.theme === "demography" && fact.target === "summary",
  );
  if (demographySummary) {
    picks.push(demographySummary);
  }

  for (const fact of facts) {
    if (fact.target !== "watchPoints" || fact.theme === "demography") continue;
    if (picks.length >= 2) break;
    picks.push(fact);
  }

  return picks.slice(0, 2);
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

  const atouts = pickSummaryAtouts(selectedFacts).map(toSummaryClause);
  const enjeux = pickSummaryEnjeux(selectedFacts).map(toSummaryClause);
  const phrase2 = `Elle combine ${joinSummaryClauses(atouts)} avec ${joinSummaryClauses(enjeux)}.`;

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
