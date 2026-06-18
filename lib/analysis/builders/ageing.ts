import { computeAgeAggregates } from "../../age-aggregates";
import type { TerritoryProfile } from "../../types";
import { formatPercent } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildAgeingFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const sociodemographics = territory.enrichment?.sociodemographics;

  if (!sociodemographics?.available || sociodemographics.ageBands.length === 0) {
    return facts;
  }

  const aggregates = computeAgeAggregates(sociodemographics.ageBands);

  if (!aggregates.reliable || aggregates.part60Plus === null) {
    return facts;
  }

  facts.push(
    createFact({
      theme: "ageing",
      target: aggregates.part60Plus >= 30 ? "watchPoints" : "summary",
      sentence: `Les 60 ans et plus représentent ${formatPercent(aggregates.part60Plus)} de la population en ${sociodemographics.year}.`,
      sourceKeys: ["insee-rp"],
      year: sociodemographics.year,
      confidence: "high",
      evidence: [
        `Somme des parts 60-74 (${aggregates.part60_74} %), 75-89 (${aggregates.part75_89} %) et 90+ (${aggregates.part90Plus} %).`,
      ],
      limitations: [
        "Structure par âge issue du recensement ; distincte de l'évolution démographique.",
      ],
      numericBindings: [
        binding(aggregates.part60Plus, "part 60 ans et plus", "ageing", [
          "60 ans et plus",
          "personnes âgées",
          "vieillissement",
          "seniors",
          "population âgée",
        ]),
      ],
    }),
  );

  return facts;
}
