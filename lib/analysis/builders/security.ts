import type { TerritoryProfile } from "../../types";
import {
  assessSecurityIndicators,
  buildSecuritySummaryIssueFragments,
  buildSecurityWatchPointSentence,
} from "../security-indicators";
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

  const assessments = assessSecurityIndicators(security.indicators);
  const sentence = buildSecurityWatchPointSentence(security, assessments);
  const summaryFragments = buildSecuritySummaryIssueFragments(assessments);

  if (!sentence) {
    return facts;
  }

  facts.push(
    createFact({
      theme: "security",
      target: "watchPoints",
      sentence,
      sourceKeys: ["ssmsi"],
      year: security.year,
      confidence: "medium",
      limitations: SECURITY_LIMITATIONS,
      ...summaryFragments,
    }),
  );

  return facts;
}
