import type { TerritoryProfile } from "../../types";
import { createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildCentralityFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const geography = territory.enrichment?.geography;
  const epciRank = geography?.epciComparison?.communeRankByPopulation;
  const aavLabel = geography?.attractionArea?.categoryLabel;
  const isAavCentre = aavLabel?.toLowerCase().includes("commune-centre") ?? false;

  if (epciRank === 1 && territory.epci) {
    facts.push(
      createFact({
        theme: "centrality",
        target: "summary",
        sentence: `${territory.name} est la principale commune de ${territory.epci.name}, au premier rang par population au sein de l'intercommunalité (INSEE).`,
        sourceKeys: ["insee-geography"],
        confidence: "high",
        evidence: [`Rang population EPCI : 1/${geography?.epciComparison?.communeCount ?? "?"}`],
      }),
    );
  } else if (isAavCentre && geography?.attractionArea) {
    facts.push(
      createFact({
        theme: "centrality",
        target: "summary",
        sentence: `${territory.name} est la principale commune de la zone d'influence ${geography.attractionArea.label} (INSEE).`,
        sourceKeys: ["insee-geography"],
        confidence: "high",
      }),
    );
  } else if (epciRank !== null && epciRank !== undefined && epciRank <= 3 && territory.epci) {
    facts.push(
      createFact({
        theme: "centrality",
        target: "strengths",
        sentence: `${territory.name} occupe le ${epciRank}${epciRank === 1 ? "er" : "e"} rang par population au sein de ${territory.epci.name} (INSEE).`,
        sourceKeys: ["insee-geography"],
        confidence: "medium",
        numericBindings: [
          {
            value: epciRank,
            label: "rang population EPCI",
            theme: "centrality",
            allowedContexts: ["rang", "EPCI", "population"],
          },
        ],
      }),
    );
  }

  return facts;
}
