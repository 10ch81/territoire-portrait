import type { TerritoryProfile } from "../../types";
import { formatEuro, formatPercent } from "../format";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildIncomeFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const sociodemographics = territory.enrichment?.sociodemographics;

  if (!sociodemographics?.available || sociodemographics.medianDisposableIncome === null) {
    return facts;
  }

  facts.push(
    createFact({
      theme: "income",
      target: "summary",
      sentence: `Le revenu médian des ménages s'élève à ${formatEuro(sociodemographics.medianDisposableIncome)} au recensement ${sociodemographics.year} (FILOSOFI).`,
      sourceKeys: ["insee-filosofi"],
      year: sociodemographics.year,
      confidence: "high",
      numericBindings: [
        binding(
          sociodemographics.medianDisposableIncome,
          "revenu médian disponible",
          "income",
          ["revenu", "médian", "FILOSOFI", "disponible"],
        ),
      ],
    }),
  );

  return facts;
}

export function buildEmploymentFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const sociodemographics = territory.enrichment?.sociodemographics;

  if (!sociodemographics?.available || sociodemographics.unemploymentRate === null) {
    return facts;
  }

  const isHigh = sociodemographics.unemploymentRate >= 10;

  facts.push(
    createFact({
      theme: "employment",
      target: isHigh ? "watchPoints" : "summary",
      sentence: `Le taux de chômage des 15-64 ans s'élève à ${formatPercent(sociodemographics.unemploymentRate)} au recensement ${sociodemographics.year}.`,
      sourceKeys: ["insee-rp"],
      year: sociodemographics.year,
      confidence: "high",
      limitations: [
        "Chômage RP INSEE ; distinct du BIT national et de FLORES (emploi salarié).",
      ],
      numericBindings: [
        binding(
          sociodemographics.unemploymentRate,
          "taux de chômage 15-64",
          "employment",
          ["chômage", "taux de chômage", "15-64", "actifs"],
        ),
      ],
    }),
  );

  return facts;
}
