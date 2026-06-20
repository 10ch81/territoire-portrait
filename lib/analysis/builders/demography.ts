import { computePopulationGrowthFromHistory } from "../../demographic-indicators";
import {
  computeYoungAdultShare,
  formatFrenchPercentOneDecimal,
  YOUNG_ADULT_STRENGTH_THRESHOLD_PERCENT,
} from "../../age-aggregates";
import type { TerritoryProfile } from "../../types";
import { qualifiesAsStrongYouthStrength } from "../strength-signals";
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

  if (growthPercent !== null && fromYear !== null && toYear !== null) {
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
  }

  const sociodemographics = territory.enrichment?.sociodemographics;
  if (sociodemographics?.available && qualifiesAsStrongYouthStrength(territory)) {
    const share = computeYoungAdultShare(sociodemographics.ageBands);
    if (share !== null) {
      const shareLabel = formatFrenchPercentOneDecimal(share);
      facts.push(
        createFact({
          theme: "demography",
          target: "strengths",
          sentence: `Les moins de 30 ans représentent ${shareLabel} % de la population en ${sociodemographics.year}.`,
          sourceKeys: ["insee-rp"],
          year: sociodemographics.year,
          confidence: "high",
          limitations: [
            `Part 0–29 ans (somme des tranches 0–14 et 15–29) ; seuil retenu > ${YOUNG_ADULT_STRENGTH_THRESHOLD_PERCENT} %.`,
          ],
          numericBindings: [
            binding(share, "part moins de 30 ans", "demography", [
              "moins de 30 ans",
              "jeunes",
              "0-29",
              "structure par âge",
            ]),
          ],
        }),
      );
    }
  }

  return facts;
}
