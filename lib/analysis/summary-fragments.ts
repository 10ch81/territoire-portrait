import {
  POPULATION_GROWTH_TOLERANCE,
  computePopulationGrowthFromHistory,
} from "../demographic-indicators";
import { formatFrenchPercentOneDecimal } from "../age-aggregates";
import type { TerritoryProfile } from "../types";
import type { AnalysisFact, AnalysisFactSummaryFragments } from "./types";
import { frenchAfterA } from "./render-text";

function withIssueFragments(nominative: string): AnalysisFactSummaryFragments {
  return {
    summaryIssuePhrase: nominative,
    summaryIssueAfterA: frenchAfterA(nominative),
  };
}

function formatDemographyPercentMagnitude(percent: number): string {
  return `${formatFrenchPercentOneDecimal(Math.abs(percent))} %`;
}

function resolvePopulationGrowth(territory: TerritoryProfile): {
  percent: number;
  fromYear: number;
  toYear: number;
} | null {
  const derived = territory.enrichment?.derived;
  let percent = derived?.populationGrowthPercent ?? null;
  let fromYear = derived?.populationGrowthFromYear ?? null;
  let toYear = derived?.populationGrowthToYear ?? null;

  if (percent === null) {
    const computed = computePopulationGrowthFromHistory(
      territory.enrichment?.populationHistory?.history,
    );
    percent = computed.percent;
    fromYear = computed.fromYear;
    toYear = computed.toYear;
  }

  if (percent === null || fromYear === null || toYear === null) {
    return null;
  }

  return { percent, fromYear, toYear };
}

export function buildDemographyContextPhrase(territory: TerritoryProfile): string | null {
  const growth = resolvePopulationGrowth(territory);
  if (!growth) return null;

  const { percent, fromYear, toYear } = growth;
  const label = formatDemographyPercentMagnitude(percent);

  if (Math.abs(percent) <= POPULATION_GROWTH_TOLERANCE) {
    return `une évolution démographique limitée entre ${fromYear} et ${toYear}`;
  }

  if (percent > 0) {
    return `une croissance démographique de ${label} entre ${fromYear} et ${toYear}`;
  }

  return `un recul de population de ${label} entre ${fromYear} et ${toYear}`;
}

function fragmentsForCentrality(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): AnalysisFactSummaryFragments {
  const epciRank = territory.enrichment?.geography?.epciComparison?.communeRankByPopulation;
  const isAavCentre =
    territory.enrichment?.geography?.attractionArea?.categoryLabel
      ?.toLowerCase()
      .includes("commune-centre") ?? false;

  if (fact.target === "strengths") {
    if (epciRank === 1) {
      return { summaryAssetPhrase: "un rôle de centralité au sein de son intercommunalité" };
    }
    if (epciRank !== null && epciRank !== undefined && epciRank <= 3) {
      return { summaryAssetPhrase: "un rang élevé au sein de son EPCI" };
    }
  }

  if (fact.target === "summary" && isAavCentre) {
    return { summaryAssetPhrase: "une centralité territoriale documentée" };
  }

  if (fact.target === "summary" && epciRank === 1) {
    return { summaryAssetPhrase: "un rôle de centralité au sein de son intercommunalité" };
  }

  return {};
}

function fragmentsForDemography(
  territory: TerritoryProfile,
): AnalysisFactSummaryFragments {
  const context = buildDemographyContextPhrase(territory);
  if (!context) return {};
  return { summaryContextPhrase: context };
}

function fragmentsForFact(
  fact: AnalysisFact,
  territory: TerritoryProfile,
): AnalysisFactSummaryFragments {
  const connectivity = territory.enrichment?.mobility?.connectivity;
  const fiberShare = connectivity?.fiberEligibleSharePercent ?? null;

  switch (fact.theme) {
    case "centrality":
      return fragmentsForCentrality(fact, territory);

    case "demography":
      return fragmentsForDemography(territory);

    case "equipments":
      if (fact.target === "strengths") {
        return { summaryAssetPhrase: "une offre d'équipements recensée" };
      }
      return {};

    case "public_services":
      if (fact.target === "strengths") {
        return { summaryAssetPhrase: "un accès aux services publics de proximité" };
      }
      return {};

    case "connectivity":
      if (fact.target === "strengths" && fiberShare !== null) {
        if (fiberShare >= 70) {
          return { summaryAssetPhrase: "une part élevée de locaux raccordables à la fibre" };
        }
        return { summaryAssetPhrase: "une connectivité numérique documentée" };
      }
      return {};

    case "tourism":
      if (fact.target === "strengths") {
        return { summaryAssetPhrase: "une capacité d'hébergement touristique recensée" };
      }
      return {};

    case "economy":
      if (fact.target === "strengths") {
        return { summaryAssetPhrase: "une base économique locale documentée par SIDE INSEE" };
      }
      return {};

    case "ess_rge":
      if (fact.target === "strengths") {
        return { summaryAssetPhrase: "des structures ESS et des entreprises RGE recensées" };
      }
      return {};

    case "employment_sectors":
      if (fact.target === "strengths") {
        return { summaryAssetPhrase: "une base d'emploi salarié locale documentée par FLORES" };
      }
      return {};

    case "health":
      if (fact.target === "strengths") {
        return {
          summaryAssetPhrase: "une offre de soins et d'accompagnement social recensée",
        };
      }
      return {};

    case "education":
      if (fact.target === "strengths") {
        return { summaryAssetPhrase: "une offre éducative locale documentée" };
      }
      return {};

    case "mobility":
      if (fact.target === "strengths") {
        return { summaryAssetPhrase: "une offre de mobilité documentée" };
      }
      return {};

    case "energy":
      if (fact.target === "strengths") {
        return { summaryAssetPhrase: "une infrastructure énergétique locale documentée" };
      }
      return {};

    case "employment":
      if (fact.target === "watchPoints") {
        return withIssueFragments("le chômage des 15-64 ans");
      }
      return {};

    case "housing":
      if (fact.target === "watchPoints" && /logements vacants/i.test(fact.sentence)) {
        return withIssueFragments("la vacance résidentielle");
      }
      return {};

    case "social_housing":
      if (fact.target === "watchPoints") {
        return withIssueFragments("le parc locatif social recensé");
      }
      return {};

    case "policy_city":
      if (fact.target === "watchPoints") {
        return withIssueFragments("la présence de quartiers prioritaires");
      }
      return {};

    case "security":
      if (fact.target === "watchPoints") {
        return withIssueFragments("certains indicateurs de sécurité");
      }
      return {};

    case "risks":
      if (fact.target === "watchPoints") {
        if (/catastrophe naturelle/i.test(fact.sentence)) {
          return withIssueFragments("les catastrophes naturelles");
        }
        if (/inondation/i.test(fact.sentence)) {
          return withIssueFragments("l'exposition aux risques d'inondation");
        }
        if (/radon/i.test(fact.sentence)) {
          return withIssueFragments("le potentiel radon recensé");
        }
        return withIssueFragments("les risques naturels identifiés");
      }
      return {};

    case "ageing":
      if (fact.target === "watchPoints") {
        return withIssueFragments("le vieillissement de la population");
      }
      return {};

    case "finances":
      if (fact.target === "watchPoints" && /dette/i.test(fact.sentence)) {
        return withIssueFragments("l'endettement communal");
      }
      return {};

    case "real_estate":
      if (fact.target === "watchPoints") {
        return withIssueFragments("le marché immobilier local");
      }
      return {};

    case "income":
      if (fact.target === "watchPoints") {
        return withIssueFragments("le niveau de revenu médian des ménages");
      }
      return {};

    default:
      return {};
  }
}

/** Attache des fragments rédigés aux constats — source unique pour le résumé déterministe. */
export function enrichFactsWithSummaryFragments(
  facts: AnalysisFact[],
  territory: TerritoryProfile,
): AnalysisFact[] {
  return facts.map((fact) => {
    const fragments = fragmentsForFact(fact, territory);
    return {
      ...fact,
      ...fragments,
    };
  });
}

export function hasSummaryAssetPhrase(fact: AnalysisFact): boolean {
  return typeof fact.summaryAssetPhrase === "string" && fact.summaryAssetPhrase.length > 0;
}

export function hasSummaryIssuePhrase(fact: AnalysisFact): boolean {
  return typeof fact.summaryIssuePhrase === "string" && fact.summaryIssuePhrase.length > 0;
}

export function hasSummaryIssueAfterA(fact: AnalysisFact): boolean {
  return typeof fact.summaryIssueAfterA === "string" && fact.summaryIssueAfterA.length > 0;
}
