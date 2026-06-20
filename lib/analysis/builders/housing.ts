import type { TerritoryProfile } from "../../types";
import {
  qualifiesAsProfileAwareLovacWatchPoint,
  resolveComparisonProfile,
} from "../../typology/thresholds";
import {
  buildDualVacancyWatchPointEvidence,
  buildDualVacancyWatchPointSentence,
  buildVacancyPriceTensionWatchPointEvidence,
  buildVacancyPriceTensionWatchPointSentence,
  dualVacancyWatchPointLimitations,
  qualifiesAsDualVacancy,
  resolveVacancyPriceTensionSourceKeys,
  shouldEmitVacancyPriceTensionWatchPoint,
  suppressIsolatedVacancyWatchPoint,
  vacancyPriceTensionNumericBindings,
  vacancyPriceTensionWatchPointLimitations,
} from "../housing-vacancy-cross";
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

  const dualVacancy = qualifiesAsDualVacancy(territory);
  const suppressIsolatedWatch = suppressIsolatedVacancyWatchPoint(territory);

  if (housing.rpVacancyRatePercent !== null) {
    const isHigh = qualifiesAsVacancyWatchPoint(housing.rpVacancyRatePercent, territory);
    const rpTarget = isHigh && !suppressIsolatedWatch ? "watchPoints" : "summary";

    facts.push(
      createFact({
        theme: "housing",
        target: rpTarget,
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

    const lovacTarget = suppressIsolatedWatch ? "summary" : "watchPoints";

    facts.push(
      createFact({
        theme: "housing",
        target: lovacTarget,
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

  if (dualVacancy) {
    facts.push(
      createFact({
        theme: "housing",
        target: "watchPoints",
        sentence: buildDualVacancyWatchPointSentence(housing),
        evidence: buildDualVacancyWatchPointEvidence(housing),
        sourceKeys: ["insee-rp-logement", "cerema-lovac"],
        year: housing.year,
        confidence: "high",
        limitations: dualVacancyWatchPointLimitations(housing, territory),
        numericBindings: [
          binding(
            housing.rpVacancyRatePercent!,
            "part logements vacants RP",
            "housing",
            ["logements vacants", "vacance", "ensemble des logements", "INSEE", "recensement"],
          ),
          binding(
            housing.privateVacancyRatePercent!,
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

  const property = territory.enrichment?.property;
  if (shouldEmitVacancyPriceTensionWatchPoint(territory) && property?.available) {
    facts.push(
      createFact({
        theme: "housing",
        target: "watchPoints",
        sentence: buildVacancyPriceTensionWatchPointSentence(territory),
        evidence: buildVacancyPriceTensionWatchPointEvidence(territory),
        sourceKeys: resolveVacancyPriceTensionSourceKeys(territory),
        year: property.year,
        confidence: "medium",
        limitations: vacancyPriceTensionWatchPointLimitations(territory),
        numericBindings: vacancyPriceTensionNumericBindings(territory, property),
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

    if (housing.socialHousingSharePercent !== null) {
      facts.push(
        createFact({
          theme: "social_housing",
          target: "summary",
          sentence: `Le logement social représente ${formatPercent(housing.socialHousingSharePercent)} du parc global en ${housing.year} (RPLS).`,
          sourceKeys: ["rpls"],
          year: housing.year,
          confidence: "high",
          limitations: ["Part du parc locatif social RPLS dans le parc global."],
          numericBindings: [
            binding(
              housing.socialHousingSharePercent,
              "part logement social RPLS",
              "social_housing",
              ["logement social", "RPLS", "parc global"],
            ),
          ],
        }),
      );
    }

    if (housing.vacancyRatePercent !== null) {
      facts.push(
        createFact({
          theme: "social_housing",
          target: "summary",
          sentence: `La vacance du parc locatif social s'élève à ${formatPercent(housing.vacancyRatePercent)} en ${housing.year} (RPLS).`,
          sourceKeys: ["rpls"],
          year: housing.year,
          confidence: "high",
          limitations: ["Vacance du parc locatif social — distinct de la vacance globale RP."],
          numericBindings: [
            binding(
              housing.vacancyRatePercent,
              "vacance parc social RPLS",
              "social_housing",
              ["vacance", "logement social", "RPLS"],
            ),
          ],
        }),
      );
    }
  }

  return facts;
}
