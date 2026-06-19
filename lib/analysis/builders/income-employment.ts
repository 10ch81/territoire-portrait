import type { TerritoryProfile } from "../../types";
import { formatEuro, formatPercent } from "../format";
import {
  buildIncomeWatchPointSentence,
  qualifiesAsIncomeWatchPoint,
  qualifiesAsUnemploymentWatchPoint,
} from "../socio-economic-watch-points";
import { binding, createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildIncomeFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const sociodemographics = territory.enrichment?.sociodemographics;

  if (!sociodemographics?.available || sociodemographics.medianDisposableIncome === null) {
    return facts;
  }

  const incomeYear = sociodemographics.incomeYear ?? sociodemographics.year;

  facts.push(
    createFact({
      theme: "income",
      target: "summary",
      sentence: `Le niveau de vie médian s'élève à ${formatEuro(sociodemographics.medianDisposableIncome)} (FILOSOFI ${incomeYear}).`,
      sourceKeys: ["insee-filosofi"],
      year: incomeYear,
      confidence: "high",
      numericBindings: [
        binding(
          sociodemographics.medianDisposableIncome,
          "niveau de vie médian",
          "income",
          ["niveau", "vie", "médian", "FILOSOFI"],
        ),
      ],
    }),
  );

  if (qualifiesAsIncomeWatchPoint(territory)) {
    facts.push(
      createFact({
        theme: "income",
        target: "watchPoints",
        sentence: buildIncomeWatchPointSentence(territory),
        sourceKeys: ["insee-filosofi"],
        year: incomeYear,
        confidence: "medium",
        limitations: [
          "Niveau de vie médian FILOSOFI 2 ; non comparable aux millésimes 2012-2021.",
        ],
        numericBindings: [
          binding(
            sociodemographics.medianDisposableIncome,
            "niveau de vie médian",
            "income",
            ["niveau", "vie", "médian", "FILOSOFI", "fragilité", "repères"],
          ),
        ],
      }),
    );
  }

  return facts;
}

export function buildEmploymentFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const sociodemographics = territory.enrichment?.sociodemographics;

  if (!sociodemographics?.available || sociodemographics.unemploymentRate === null) {
    return facts;
  }

  const isHigh = qualifiesAsUnemploymentWatchPoint(sociodemographics.unemploymentRate);

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

export function buildLabourMarketFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const labourMarket = territory.enrichment?.labourMarket;

  if (!labourMarket?.available || labourMarket.totalJobSeekers == null) {
    return facts;
  }

  facts.push(
    createFact({
      theme: "employment",
      target: "summary",
      sentence: `${labourMarket.totalJobSeekers.toLocaleString("fr-FR")} inscrits à France Travail en moyenne sur le trimestre ${labourMarket.quarter ?? ""} (catégorie ABC).`,
      sourceKeys: ["france-travail-defm"],
      year: labourMarket.quarter
        ? Number.parseInt(labourMarket.quarter.split("-")[0] ?? "", 10)
        : undefined,
      confidence: "medium",
      limitations: [
        labourMarket.note,
        "Ne pas confondre avec le taux de chômage RP (BIT recensement).",
      ],
      numericBindings: [
        binding(
          labourMarket.totalJobSeekers,
          "inscrits France Travail ABC",
          "employment",
          ["France Travail", "inscrits", "demandeurs d'emploi", "ABC"],
        ),
      ],
    }),
  );

  if (labourMarket.under25 != null) {
    facts.push(
      createFact({
        theme: "employment",
        target: "summary",
        sentence: `${labourMarket.under25.toLocaleString("fr-FR")} inscrits de moins de 25 ans sur le trimestre ${labourMarket.quarter ?? ""} (France Travail).`,
        sourceKeys: ["france-travail-defm"],
        confidence: "medium",
        limitations: ["Effectifs arrondis au multiple de 5."],
        numericBindings: [
          binding(
            labourMarket.under25,
            "inscrits France Travail moins de 25 ans",
            "employment",
            ["moins de 25 ans", "jeunes", "France Travail"],
          ),
        ],
      }),
    );
  }

  return facts;
}
