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
  const evolutionSentence = isDecline
    ? `La population recule de ${formatted} entre ${fromYear} et ${toYear}.`
    : `La population progresse de ${formatted} entre ${fromYear} et ${toYear}.`;

  const evolutionBindings = [
    binding(growthPercent, "évolution démographique", "demography", [
      "recul",
      "baisse",
      "croissance",
      "évolution",
      "population",
      "entre",
      "depuis",
    ]),
  ];

  const evolutionMeta = {
    sourceKeys: ["insee-population"],
    year: toYear,
    confidence: "high" as const,
    limitations: [
      "Évolution calculée sur la série des populations officielles disponibles.",
    ],
    numericBindings: evolutionBindings,
  };

  facts.push(
    createFact({
      theme: "demography",
      target: isDecline ? "watchPoints" : "summary",
      sentence: evolutionSentence,
      ...evolutionMeta,
    }),
  );

  if (isDecline) {
    facts.push(
      createFact({
        theme: "demography",
        target: "summary",
        sentence: evolutionSentence,
        ...evolutionMeta,
      }),
    );
  }

  return facts;
}
