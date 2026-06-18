import type { TerritoryProfile } from "../../types";
import { formatPercent } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildHousingFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const housing = territory.enrichment?.housing;

  if (!housing?.available || housing.rpVacancyRatePercent === null) {
    return facts;
  }

  const isHigh = housing.rpVacancyRatePercent >= 10;

  facts.push(
    createFact({
      theme: "housing",
      target: isHigh ? "watchPoints" : "summary",
      sentence: `La vacance résidentielle atteint ${formatPercent(housing.rpVacancyRatePercent)} du parc global en ${housing.year}.`,
      sourceKeys: ["insee-rp-logement"],
      year: housing.year,
      confidence: "high",
      limitations: ["Vacance du parc global RP ; distinct du parc locatif social RPLS."],
      numericBindings: [
        binding(
          housing.rpVacancyRatePercent,
          "taux vacance résidentielle",
          "housing",
          ["vacance", "résidentielle", "parc global", "logements vacants"],
        ),
      ],
    }),
  );

  return facts;
}

export function buildSocialHousingFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const housing = territory.enrichment?.housing;

  if (!housing?.available) return facts;

  if (housing.totalUnits === 0 || housing.totalUnits === null) {
    facts.push(
      createFact({
        theme: "social_housing",
        target: "watchPoints",
        sentence: `Aucun logement locatif social n'est recensé dans RPLS ${housing.year}.`,
        sourceKeys: ["rpls"],
        year: housing.year,
        confidence: "high",
        limitations: [
          "RPLS ne couvre que le parc locatif social des bailleurs sociaux.",
          "Ne pas conclure à l'absence totale de logements sociaux.",
        ],
      }),
    );
  } else if (housing.totalUnits !== null) {
    facts.push(
      createFact({
        theme: "social_housing",
        target: "summary",
        sentence: `RPLS ${housing.year} recense ${housing.totalUnits.toLocaleString("fr-FR")} logements locatifs sociaux sur la commune.`,
        sourceKeys: ["rpls"],
        year: housing.year,
        confidence: "high",
        limitations: ["Parc locatif social des bailleurs sociaux uniquement."],
        numericBindings: [
          binding(
            housing.totalUnits,
            "logements locatifs sociaux RPLS",
            "social_housing",
            ["RPLS", "logements sociaux", "locatif social"],
          ),
        ],
      }),
    );
  }

  return facts;
}
