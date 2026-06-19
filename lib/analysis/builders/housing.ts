import type { TerritoryProfile } from "../../types";
import {
  qualifiesAsProfileAwareLovacWatchPoint,
  resolveComparisonProfile,
} from "../../typology/thresholds";
import { formatPercent } from "../format";
import { qualifiesAsVacancyWatchPoint } from "../qualify-facts";
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

  if (housing.rpVacancyRatePercent !== null) {
    const isHigh = qualifiesAsVacancyWatchPoint(housing.rpVacancyRatePercent);

    facts.push(
      createFact({
        theme: "housing",
        target: isHigh ? "watchPoints" : "summary",
        sentence: `Les logements vacants représentent ${formatPercent(housing.rpVacancyRatePercent)} de l'ensemble des logements en ${housing.year} (INSEE).`,
        sourceKeys: ["insee-rp-logement"],
        year: housing.year,
        confidence: "high",
        limitations: [
          "Logements vacants du parc global INSEE ; distinct du parc locatif social (RPLS).",
        ],
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
  }

  if (
    housing.privateVacancyRatePercent != null &&
    housing.lovacVintage != null &&
    qualifiesAsProfileAwareLovacWatchPoint(
      housing.privateVacancyRatePercent,
      resolveComparisonProfile(territory),
    )
  ) {
    const structuralPart =
      housing.privateVacantStructural != null
        ? `, dont ${housing.privateVacantStructural.toLocaleString("fr-FR")} vacants depuis au moins deux ans`
        : "";

    facts.push(
      createFact({
        theme: "housing",
        target: "watchPoints",
        sentence: `Le parc privé compte ${formatPercent(housing.privateVacancyRatePercent)} de logements vacants au 1er janvier ${housing.lovacVintage} (LOVAC)${structuralPart}.`,
        sourceKeys: ["cerema-lovac"],
        year: housing.lovacVintage,
        confidence: "medium",
        limitations: [
          "Parc privé vacant (sources fiscales) — distinct de la vacance générale RP.",
          housing.lovacNote ?? "Surestimation possible vs recensement.",
        ],
        numericBindings: [
          binding(
            housing.privateVacancyRatePercent,
            "taux vacance parc privé LOVAC",
            "housing",
            ["LOVAC", "parc privé", "vacance", "logements vacants"],
          ),
          ...(housing.privateVacantStructural != null
            ? [
                binding(
                  housing.privateVacantStructural,
                  "logements privés vacants structurels LOVAC",
                  "housing",
                  ["LOVAC", "vacance structurelle", "deux ans", "parc privé"],
                ),
              ]
            : []),
        ],
      }),
    );
  }

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
        target: "summary",
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
