import type { TerritoryProfile } from "../../types";
import { buildTerritoryContext } from "../context/buildTerritoryContext";
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
  const territoryContext = buildTerritoryContext(territory);
  const sentence = buildSecurityWatchPointSentence(security, assessments, {
    securitySmallNumbersRisk: territoryContext.securitySmallNumbersRisk === true,
  });
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

  const aboveReference = assessments.filter((assessment) => assessment.aboveReference);
  for (const assessment of aboveReference.slice(0, 4)) {
    facts.push(
      createFact({
        theme: "security",
        target: "summary",
        sentence: `${assessment.label} : ${assessment.localRate.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pour 1 000 habitants (référence départementale ${assessment.referenceRate.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}, SSMSI ${security.year}).`,
        sourceKeys: ["ssmsi"],
        year: security.year,
        confidence: "medium",
        limitations: SECURITY_LIMITATIONS,
        numericBindings: [
          {
            value: assessment.localRate,
            label: `${assessment.id} pour 1000 hab.`,
            theme: "security",
            allowedContexts: [assessment.label, "pour 1 000 habitants", "SSMSI"],
          },
        ],
      }),
    );
  }

  return facts;
}
