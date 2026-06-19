import type { TerritoryProfile } from "../types";
import type { TerritoryContext } from "./context/buildTerritoryContext";
import { isRadonRiskWatchFact } from "./risk-watch-subtypes";
import type { AnalysisFact } from "./types";

/** Seuil minimal de quartiers prioritaires pour éligibilité watchPoint QPV. */
export const QPV_WATCH_POINT_MIN_COUNT = 3;

export function passesWatchPointSelectionGates(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  territoryContext: TerritoryContext,
): boolean {
  if (fact.theme === "risks" && isRadonRiskWatchFact(fact)) {
    return false;
  }

  if (fact.theme === "policy_city") {
    const qpvCount = territory.enrichment?.urbanPolicy?.qpvCount ?? 0;
    if (qpvCount < QPV_WATCH_POINT_MIN_COUNT) {
      return false;
    }
  }

  if (fact.theme === "mobility" && fact.target === "watchPoints") {
    return false;
  }

  return true;
}

export function qpvDenseUrbanScoreBonus(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  territoryContext: TerritoryContext,
): number {
  if (fact.theme !== "policy_city") {
    return 0;
  }

  const qpvCount = territory.enrichment?.urbanPolicy?.qpvCount ?? 0;
  if (qpvCount < QPV_WATCH_POINT_MIN_COUNT) {
    return 0;
  }

  if (territoryContext.isDenseUrban === true) {
    return 12;
  }

  return 0;
}
