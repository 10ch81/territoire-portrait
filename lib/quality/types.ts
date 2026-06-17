export type QualitySeverity = "ok" | "warning" | "critical";

export type DiscrepancyClass =
  | "MILLESIME_DIFF"
  | "DEFINITION_DIFF"
  | "PARSER_BUG"
  | "JOIN_KEY_ERROR"
  | "CACHE_STALE"
  | "SOURCE_UPDATED"
  | "OK";

export type QualityPhase =
  | "validate-internal"
  | "verify-reference"
  | "quality-all";

export interface QualityFinding {
  ruleId: string;
  severity: QualitySeverity;
  location: string;
  message: string;
  inseeCode?: string;
  class?: DiscrepancyClass;
  expected?: number | string | null;
  actual?: number | string | null;
}

export interface QualitySummary {
  ok: number;
  warning: number;
  critical: number;
  failed: boolean;
}

export interface QualityReport {
  generatedAt: string;
  phase: QualityPhase;
  findings: QualityFinding[];
  summary: QualitySummary;
}
