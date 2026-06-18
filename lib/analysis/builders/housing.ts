import type { TerritoryProfile } from "../../types";
import { formatPercent } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildHousingFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const housing = territory.enrichment?.housing;

  if (!housing?.available) return facts;

  if (housing.totalDwellings !== null && housing.totalDwellings > 0) {
    facts.push(
      createFact({
        theme: "housing",
        target: "summary",
        sentence: `L'ensemble des logements recensé au recensement ${housing.year} s'élève à ${housing.totalDwellings.toLocaleString("fr-FR")} logements (INSEE).`,
        sourceKeys: ["insee-rp-logement"],
        year: housing.year,
        confidence: "high",
        limitations: [
          "Parc global INSEE ; distinct du parc locatif social (RPLS).",
        ],
        numericBindings: [
          binding(
            housing.totalDwellings,
          "ensemble des logements INSEE",
          "housing",
          ["logements", "ensemble", "INSEE", "recensement"],
          ),
        ],
      }),
    );
  }

  if (housing.rpVacancyRatePercent === null) {
    return facts;
  }

  const isHigh = housing.rpVacancyRatePercent >= 10;

  facts.push(
    createFact({
      theme: "housing",
      target: isHigh ? "watchPoints" : "summary",
      sentence: `Les logements vacants représentent ${formatPercent(housing.rpVacancyRatePercent)} de l'ensemble des logements en ${housing.year} (INSEE).`,
      sourceKeys: ["insee-rp-logement"],
      year: housing.year,
      confidence: "high",
      limitations: ["Logements vacants du parc global INSEE ; distinct du parc locatif social (RPLS)."],
      numericBindings: [
        binding(
          housing.rpVacancyRatePercent,
          "part logements vacants",
          "housing",
          ["logements vacants", "vacance", "ensemble des logements", "logements"],
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
        sentence: `Aucun logement locatif social recensé en ${housing.year} (RPLS).`,
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
        sentence: `${housing.totalUnits.toLocaleString("fr-FR")} logements locatifs sociaux recensés sur la commune en ${housing.year} (RPLS).`,
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
