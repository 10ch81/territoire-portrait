import type { TerritoryProfile } from "../../types";
import { createFact } from "./utils";
import type { AnalysisFact } from "../types";

const SECURITY_LIMITATIONS = [
  "Faits enregistrés par police/gendarmerie (lieu de commission).",
  "Ne mesure pas le ressenti d'insécurité ni les faits non déclarés.",
  "Une seule année ne permet pas d'établir de tendance.",
];

export function buildSecurityFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const security = territory.enrichment?.security;

  if (!security?.available || security.diffusedIndicatorCount === 0) {
    return facts;
  }

  const hasHigherThanDepartment = security.indicators.some(
    (i) =>
      i.departmentRatePer1000 !== null &&
      i.ratePer1000 !== null &&
      i.ratePer1000 > i.departmentRatePer1000,
  );

  if (!hasHigherThanDepartment) {
    return facts;
  }

  facts.push(
    createFact({
      theme: "security",
      target: "watchPoints",
      sentence: `Certains indicateurs de sécurité enregistrée dépassent les références départementales disponibles, à interpréter avec prudence (SSMSI ${security.year}).`,
      sourceKeys: ["ssmsi"],
      year: security.year,
      confidence: "medium",
      limitations: SECURITY_LIMITATIONS,
    }),
  );

  return facts;
}
