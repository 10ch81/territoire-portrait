import type { SecurityIndicatorSnapshot, SecuritySnapshot } from "../types";
import type { AnalysisFactSummaryFragments } from "./types";
import { frenchAfterA } from "./render-text";

/** Seuil minimal de dépassement par rapport à la référence départementale (+10 %). */
export const SECURITY_REFERENCE_EXCESS_RATIO = 1.1;

export type SecurityIndicatorAssessment = {
  id: string;
  label: string;
  localRate: number;
  referenceRate: number;
  ratio: number;
  count: number | null;
  aboveReference: boolean;
};

function isIndicatorAboveReference(
  localRate: number,
  referenceRate: number,
): boolean {
  if (referenceRate > 0) {
    return localRate >= referenceRate * SECURITY_REFERENCE_EXCESS_RATIO;
  }

  return localRate > 0;
}

export function assessSecurityIndicator(
  indicator: SecurityIndicatorSnapshot,
): SecurityIndicatorAssessment | null {
  if (!indicator.diffused) {
    return null;
  }

  const localRate = indicator.ratePer1000;
  const referenceRate = indicator.departmentRatePer1000;

  if (localRate === null || referenceRate === null) {
    return null;
  }

  return {
    id: indicator.id,
    label: indicator.label,
    localRate,
    referenceRate,
    ratio: referenceRate > 0 ? localRate / referenceRate : Number.POSITIVE_INFINITY,
    count: indicator.count,
    aboveReference: isIndicatorAboveReference(localRate, referenceRate),
  };
}

export function assessSecurityIndicators(
  indicators: SecurityIndicatorSnapshot[],
): SecurityIndicatorAssessment[] {
  return indicators
    .map(assessSecurityIndicator)
    .filter((assessment): assessment is SecurityIndicatorAssessment => assessment !== null);
}

export function countSecurityIndicatorsAboveReference(
  assessments: SecurityIndicatorAssessment[],
): number {
  return assessments.filter((assessment) => assessment.aboveReference).length;
}

export type SecurityWatchPointFormulation = "none" | "single" | "multiple" | "majority";

export function resolveSecurityWatchPointFormulation(
  assessments: SecurityIndicatorAssessment[],
): {
  formulation: SecurityWatchPointFormulation;
  aboveReference: SecurityIndicatorAssessment[];
} {
  const aboveReference = assessments.filter((assessment) => assessment.aboveReference);
  const aboveCount = aboveReference.length;
  const comparableCount = assessments.length;

  if (aboveCount === 0) {
    return { formulation: "none", aboveReference };
  }

  if (aboveCount === 1) {
    return { formulation: "single", aboveReference };
  }

  const hasMajority = aboveCount > comparableCount / 2;
  return {
    formulation: hasMajority ? "majority" : "multiple",
    aboveReference,
  };
}

const SSMSI_PRUDENCE = (year: number) =>
  `, à interpréter avec prudence (SSMSI ${year}).`;

const SSMSI_SMALL_NUMBERS_PRUDENCE = (year: number) =>
  ` ; compte tenu du faible volume de faits et de la diffusion partielle des indicateurs, ce signal doit être interprété avec prudence (SSMSI ${year}).`;

export function buildSecurityWatchPointSentence(
  security: SecuritySnapshot,
  assessments: SecurityIndicatorAssessment[],
  options?: { securitySmallNumbersRisk?: boolean },
): string | null {
  const { formulation, aboveReference } = resolveSecurityWatchPointFormulation(assessments);
  const prudence =
    options?.securitySmallNumbersRisk === true
      ? SSMSI_SMALL_NUMBERS_PRUDENCE(security.year)
      : SSMSI_PRUDENCE(security.year);

  switch (formulation) {
    case "none":
      return null;
    case "single":
      return `Un indicateur de sécurité — ${aboveReference[0].label} — dépasse la référence départementale disponible${prudence}`;
    case "multiple":
      return `Plusieurs indicateurs de sécurité enregistrée dépassent les références départementales disponibles${prudence}`;
    case "majority":
      return `Certains indicateurs de sécurité enregistrée dépassent les références départementales disponibles${prudence}`;
    default: {
      const _exhaustive: never = formulation;
      return _exhaustive;
    }
  }
}

export function buildSecuritySummaryIssueFragments(
  assessments: SecurityIndicatorAssessment[],
): AnalysisFactSummaryFragments {
  const { formulation, aboveReference } = resolveSecurityWatchPointFormulation(assessments);

  let phrase: string | null = null;

  switch (formulation) {
    case "single":
      phrase = `un indicateur de sécurité (${aboveReference[0].label.toLowerCase()})`;
      break;
    case "multiple":
      phrase = "plusieurs indicateurs de sécurité";
      break;
    case "majority":
      phrase = "certains indicateurs de sécurité";
      break;
    case "none":
      break;
    default: {
      const _exhaustive: never = formulation;
      break;
    }
  }

  if (!phrase) {
    return {};
  }

  return {
    summaryIssuePhrase: phrase,
    summaryIssueAfterA: frenchAfterA(phrase),
  };
}

export function hasSecurityIndicatorsAboveReference(
  security: SecuritySnapshot | null | undefined,
): boolean {
  if (!security?.available || security.diffusedIndicatorCount === 0) {
    return false;
  }

  const assessments = assessSecurityIndicators(security.indicators);
  return countSecurityIndicatorsAboveReference(assessments) > 0;
}
