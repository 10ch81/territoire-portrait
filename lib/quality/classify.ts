import type { DiscrepancyClass, QualitySeverity } from "./types";
import {
  computeFactor,
  computeRelativeDiffPercent,
  severityFromNumericDiff,
} from "./compare";

export interface ClassificationContext {
  referenceYear?: number | null;
  actualYear?: number | null;
  referenceSource?: string;
  actualSource?: string;
  forceClass?: DiscrepancyClass;
}

export interface ClassificationResult {
  severity: QualitySeverity;
  class: DiscrepancyClass;
  relativeDiffPercent: number;
  factor: number;
}

export function classifyIndicatorDiscrepancy(
  reference: number,
  actual: number,
  context: ClassificationContext = {},
): ClassificationResult {
  const relativeDiffPercent = computeRelativeDiffPercent(reference, actual);
  const factor = computeFactor(reference, actual);
  let severity = severityFromNumericDiff(relativeDiffPercent, factor);
  let classification: DiscrepancyClass =
    severity === "ok" ? "OK" : "PARSER_BUG";

  const referenceYear = context.referenceYear ?? null;
  const actualYear = context.actualYear ?? null;

  if (
    referenceYear !== null &&
    actualYear !== null &&
    referenceYear !== actualYear &&
    severity !== "ok"
  ) {
    classification = "MILLESIME_DIFF";
    if (severity === "critical") {
      severity = "warning";
    }
  }

  if (
    actualYear !== null &&
    severity !== "ok" &&
    classification === "PARSER_BUG" &&
    (context.referenceSource?.includes("Géo") ||
      context.actualSource?.includes("historique") ||
      context.actualSource?.includes("INSEE"))
  ) {
    classification = "MILLESIME_DIFF";
    if (severity === "critical") {
      severity = "warning";
    }
  }

  if (
    context.referenceSource?.includes("RP") ||
    context.actualSource?.includes("RP") ||
    context.referenceSource?.includes("RPLS") ||
    context.actualSource?.includes("RPLS")
  ) {
    if (severity !== "ok" && classification !== "MILLESIME_DIFF") {
      classification = "DEFINITION_DIFF";
      if (severity === "critical") {
        severity = "warning";
      }
    }
  }

  if (context.forceClass) {
    classification = context.forceClass;
  }

  return {
    severity,
    class: classification,
    relativeDiffPercent,
    factor,
  };
}
