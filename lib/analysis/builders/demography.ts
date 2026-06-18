import { computePopulationGrowthFromHistory } from "../../demographic-indicators";
import type { TerritoryProfile } from "../../types";
import { formatSignedPercent } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildDemographyFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const derived = territory.enrichment?.derived;
  const history = territory.enrichment?.populationHistory?.history ?? null;

  let growthPercent = derived?.populationGrowthPercent ?? null;
  let fromYear = derived?.populationGrowthFromYear ?? null;
  let toYear = derived?.populationGrowthToYear ?? null;

  if (growthPercent === null && history) {
    const computed = computePopulationGrowthFromHistory(history);
    growthPercent = computed.percent;
    fromYear = computed.fromYear;
    toYear = computed.toYear;
  }

  if (growthPercent === null || fromYear === null || toYear === null) {
    return facts;
  }

  const isDecline = growthPercent < 0;
  const formatted = formatSignedPercent(growthPercent);

  facts.push(
    createFact({
      theme: "demography",
      target: isDecline ? "watchPoints" : "summary",
      sentence: isDecline
        ? `La population recule de ${formatted} entre ${fromYear} et ${toYear}.`
        : `La population progresse de ${formatted} entre ${fromYear} et ${toYear}.`,
      sourceKeys: ["insee-population"],
      year: toYear,
      confidence: "high",
      limitations: [
        "Évolution calculée sur la série des populations légales disponibles.",
      ],
      numericBindings: [
        binding(growthPercent, "évolution démographique", "demography", [
          "recul",
          "baisse",
          "croissance",
          "évolution",
          "population",
          "entre",
          "depuis",
        ]),
      ],
    }),
  );

  return facts;
}
