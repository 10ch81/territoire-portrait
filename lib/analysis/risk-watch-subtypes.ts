import type { AnalysisFact } from "./types";

export type RiskWatchSubtype = "flood" | "catnat" | "radon" | "other";

/** Priorité métier pour retenir un seul fait risque (radon exclu en amont). */
export const RISK_SUBTYPE_SCORE_BONUS: Record<Exclude<RiskWatchSubtype, "radon">, number> = {
  flood: 15,
  catnat: 8,
  other: 5,
};

export function resolveRiskWatchSubtype(fact: AnalysisFact): RiskWatchSubtype | null {
  if (fact.theme !== "risks") {
    return null;
  }

  if (/radon/i.test(fact.sentence)) {
    return "radon";
  }

  if (/zones à risque d'inondation|risque d'inondation.*recens/i.test(fact.sentence)) {
    return "flood";
  }

  if (/catastrophe naturelle/i.test(fact.sentence)) {
    return "catnat";
  }

  return "other";
}

export function isRadonRiskWatchFact(fact: AnalysisFact): boolean {
  return resolveRiskWatchSubtype(fact) === "radon";
}

export function riskWatchSubtypeScoreBonus(fact: AnalysisFact): number {
  const subtype = resolveRiskWatchSubtype(fact);
  if (!subtype || subtype === "radon") {
    return 0;
  }
  return RISK_SUBTYPE_SCORE_BONUS[subtype];
}
