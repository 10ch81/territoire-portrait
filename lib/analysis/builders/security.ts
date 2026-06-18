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

  facts.push(
    createFact({
      theme: "security",
      target: "watchPoints",
      sentence: hasHigherThanDepartment
        ? `Les données SSMSI ${security.year} signalent certains indicateurs de sécurité enregistrée supérieurs aux références départementales fournies, à interpréter avec prudence.`
        : `Les données SSMSI ${security.year} recensent des faits enregistrés par police/gendarmerie, à interpréter avec prudence.`,
      sourceKeys: ["ssmsi"],
      year: security.year,
      confidence: "medium",
      limitations: SECURITY_LIMITATIONS,
    }),
  );

  return facts;
}
