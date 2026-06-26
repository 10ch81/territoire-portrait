import { POPULATION_GROWTH_TOLERANCE } from "../demographic-indicators";
import { formatFrenchPercentOneDecimal } from "../age-aggregates";
import type { TerritoryProfile } from "../types";
import type { AnalysisFact } from "./types";
import { buildDemographyContextPhrase } from "./summary-fragments";

export type DemographyTrend = "growth" | "decline" | "stable" | "unknown";

export interface DemographySnapshot {
  trend: DemographyTrend;
  percent: number | null;
  percentLabel: string | null;
  fromYear: number | null;
  toYear: number | null;
  contextPhrase: string | null;
}

const GROWTH_PRESSURE_KEYWORDS =
  /logement|habitat|densit|prix|équipement|mobilit|pression urbaine|urbanisation|urbanis/i;

function formatDemographyPercentMagnitude(percent: number): string {
  return `${formatFrenchPercentOneDecimal(Math.abs(percent))} %`;
}

function parseDemographyFromSentence(sentence: string): {
  percent: number;
  fromYear: number;
  toYear: number;
} | null {
  const decline = sentence.match(
    /La population recule de ([^.]+?) entre (\d{4}) et (\d{4})/i,
  );
  if (decline) {
    const raw = decline[1]!.trim().replace(/\s+/g, " ");
    const negative = raw.startsWith("-");
    const token = negative ? raw : `-${raw}`;
    const match = token.match(/-?([\d,]+)\s*%/);
    if (!match) return null;
    const value = -Number.parseFloat(match[1]!.replace(",", "."));
    return {
      percent: value,
      fromYear: Number.parseInt(decline[2]!, 10),
      toYear: Number.parseInt(decline[3]!, 10),
    };
  }

  const growth = sentence.match(
    /La population progresse de ([^.]+?) entre (\d{4}) et (\d{4})/i,
  );
  if (growth) {
    const raw = growth[1]!.trim().replace(/\s+/g, " ");
    const token = raw.startsWith("+") || raw.startsWith("-") ? raw : `+${raw}`;
    const match = token.match(/\+?([\d,]+)\s*%/);
    if (!match) return null;
    const value = Number.parseFloat(match[1]!.replace(",", "."));
    return {
      percent: value,
      fromYear: Number.parseInt(growth[2]!, 10),
      toYear: Number.parseInt(growth[3]!, 10),
    };
  }

  return null;
}

function trendFromPercent(percent: number): DemographyTrend {
  if (Math.abs(percent) <= POPULATION_GROWTH_TOLERANCE) {
    return "stable";
  }
  return percent > 0 ? "growth" : "decline";
}

function isDemographyEvolutionSelectedFact(fact: AnalysisFact): boolean {
  return (
    fact.theme === "demography" &&
    (fact.target === "summary" || fact.target === "watchPoints")
  );
}

export function extractDemographySnapshot(
  territory: TerritoryProfile,
  selectedFacts: AnalysisFact[],
): DemographySnapshot {
  const evolutionFact = selectedFacts.find(isDemographyEvolutionSelectedFact);

  if (!evolutionFact) {
    return {
      trend: "unknown",
      percent: null,
      percentLabel: null,
      fromYear: null,
      toYear: null,
      contextPhrase: null,
    };
  }

  const contextPhrase =
    selectedFacts.find(
      (fact) => fact.theme === "demography" && fact.summaryContextPhrase,
    )?.summaryContextPhrase ?? buildDemographyContextPhrase(territory);

  const derived = territory.enrichment?.derived;
  let percent = derived?.populationGrowthPercent ?? null;
  let fromYear = derived?.populationGrowthFromYear ?? null;
  let toYear = derived?.populationGrowthToYear ?? null;

  if (percent === null) {
    const parsed = parseDemographyFromSentence(evolutionFact.sentence);
    if (parsed) {
      percent = parsed.percent;
      fromYear = parsed.fromYear;
      toYear = parsed.toYear;
    }
  }

  if (percent === null || fromYear === null || toYear === null) {
    return {
      trend: "unknown",
      percent: null,
      percentLabel: null,
      fromYear: null,
      toYear: null,
      contextPhrase: contextPhrase ?? null,
    };
  }

  const trend = trendFromPercent(percent);

  return {
    trend,
    percent,
    percentLabel: formatDemographyPercentMagnitude(percent),
    fromYear,
    toYear,
    contextPhrase: contextPhrase ?? null,
  };
}

export function isFactEligibleForSummary(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): boolean {
  const enrichment = territory.enrichment;

  if (fact.sourceKeys.includes("france-services")) {
    return (enrichment?.proximityServices?.franceServicesCount ?? 0) > 0;
  }

  if (fact.sourceKeys.includes("tourism-capacity")) {
    return (enrichment?.tourism?.accommodationPlaces ?? 0) > 0;
  }

  if (fact.sourceKeys.includes("arcep-fibre")) {
    return (
      enrichment?.mobility?.connectivity?.available === true &&
      enrichment.mobility.connectivity.fiberEligibleSharePercent !== null
    );
  }

  if (fact.sourceKeys.includes("qpv")) {
    return (
      enrichment?.urbanPolicy?.hasQpv === true &&
      (enrichment.urbanPolicy.qpvCount ?? 0) > 0
    );
  }

  return true;
}

export function shouldIncludeAsSummaryEnjeu(fact: AnalysisFact): boolean {
  if (fact.theme === "demography") {
    return false;
  }

  if (/La population progresse de/i.test(fact.sentence)) {
    return GROWTH_PRESSURE_KEYWORDS.test(fact.sentence);
  }

  return true;
}

/** @deprecated Préférer hasUnreadySummaryFragments dans summary-compose.ts */
export function hasAwkwardSummaryConcatenation(summary: string): boolean {
  if (/Elle combine/i.test(summary)) return true;
  if (/avec une évolution de/i.test(summary)) return true;
  if (/et le taux de chômage/i.test(summary)) return true;
  if (/avec la population (?:recule|progresse)/i.test(summary)) return true;
  if (/combine .+ avec .+ et .+ s'élève/i.test(summary)) return true;
  if (/met en évidence centralité\b/i.test(summary)) return true;
  if (/liés à taux\b/i.test(summary)) return true;
  return false;
}

export function summaryMislabelsGrowthAsDecline(
  summary: string,
  demography: DemographySnapshot,
): boolean {
  if (demography.trend !== "growth") {
    return false;
  }
  return /recul de population|population recule/i.test(summary);
}

export function summaryMentionsAbsentSources(
  summary: string,
  territory: TerritoryProfile,
): boolean {
  const enrichment = territory.enrichment;

  if (
    /France Services/i.test(summary) &&
    (enrichment?.proximityServices?.franceServicesCount ?? 0) <= 0
  ) {
    return true;
  }

  if (
    /(?:hébergement touristique|capacité.*touristique|tourisme)/i.test(summary) &&
    ((enrichment?.tourism?.accommodationPlaces ?? 0) <= 0 ||
      enrichment?.tourism?.available !== true)
  ) {
    return true;
  }

  if (
    /(?:fibre|ARCEP|raccordables)/i.test(summary) &&
    (enrichment?.mobility?.connectivity?.available !== true ||
      enrichment.mobility.connectivity.fiberEligibleSharePercent === null)
  ) {
    return true;
  }

  if (
    /(?:quartiers? prioritaires?|\(QPV\))/i.test(summary) &&
    (!enrichment?.urbanPolicy?.hasQpv || (enrichment.urbanPolicy.qpvCount ?? 0) <= 0)
  ) {
    return true;
  }

  return false;
}
