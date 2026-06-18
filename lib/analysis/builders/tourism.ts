import type { TerritoryProfile } from "../../types";
import { formatCount } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildTourismFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const tourism = territory.enrichment?.tourism;

  if (!tourism?.available || tourism.accommodationPlaces <= 0) return facts;

  facts.push(
    createFact({
      theme: "tourism",
      target: "strengths",
      sentence: `La commune dispose de ${formatCount(tourism.accommodationPlaces)} places d'hébergement touristique recensées en ${tourism.year}, sans données de fréquentation.`,
      sourceKeys: ["tourism-capacity"],
      year: tourism.year,
      confidence: "medium",
      limitations: [
        "Capacité d'hébergement recensée ; pas de données de fréquentation.",
      ],
      numericBindings: [
        binding(
          tourism.accommodationPlaces,
          "places hébergement touristique",
          "tourism",
          ["hébergement", "tourisme", "places", "touristique"],
        ),
      ],
    }),
  );

  return facts;
}
