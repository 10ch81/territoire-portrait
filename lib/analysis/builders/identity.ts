import { getPopulationDisplayMeta } from "../../ux/population";
import type { TerritoryProfile } from "../../types";
import { formatCount } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildIdentityFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const populationMeta = getPopulationDisplayMeta(territory);

  if (territory.population !== null) {
    facts.push(
      createFact({
        theme: "identity",
        target: "summary",
        sentence: `La population légale s'élève à ${formatCount(territory.population)} habitants en ${populationMeta.vintage}.`,
        sourceKeys: ["geo.api.gouv.fr", "insee-population"],
        year: populationMeta.vintage,
        confidence: "high",
        numericBindings: [
          binding(
            territory.population,
            "population légale",
            "identity",
            ["population", "habitants", "population légale"],
          ),
        ],
      }),
    );
  }

  if (territory.densityPerKm2 !== null) {
    facts.push(
      createFact({
        theme: "identity",
        target: "summary",
        sentence: `La densité est de ${formatCount(Math.round(territory.densityPerKm2))} habitants/km².`,
        sourceKeys: ["geo.api.gouv.fr"],
        confidence: "high",
        numericBindings: [
          binding(
            territory.densityPerKm2,
            "densité",
            "identity",
            ["densité", "habitants/km"],
          ),
        ],
      }),
    );
  }

  return facts;
}
