export type AnalysisFactTheme =
  | "identity"
  | "centrality"
  | "demography"
  | "ageing"
  | "income"
  | "employment"
  | "economy"
  | "ess_rge"
  | "employment_sectors"
  | "equipments"
  | "public_services"
  | "housing"
  | "social_housing"
  | "policy_city"
  | "security"
  | "risks"
  | "mobility"
  | "connectivity"
  | "energy"
  | "health"
  | "education"
  | "tourism"
  | "real_estate"
  | "finances"
  | "geography";

export type AnalysisFactTarget =
  | "summary"
  | "strengths"
  | "watchPoints"
  | "opportunities";

export type AnalysisFactConfidence = "high" | "medium" | "low";

export type FactPolarity = "positive" | "neutral" | "negative" | "unknown";
export type FactIntensity = "low" | "medium" | "high";

export type FactEvidenceLevel =
  | "direct_strong"
  | "direct_moderate"
  | "single_indicator"
  | "contextual"
  | "weak_signal";

export type FactSignificanceLevel = "high" | "medium" | "low";

export type FactBenchmarkStatus = "available" | "missing" | "not_required";

export type FactDenominatorRisk =
  | "none"
  | "tourist_population"
  | "small_population"
  | "other";

export type FactProgressiveQualification = {
  evidenceLevel: FactEvidenceLevel;
  significanceLevel: FactSignificanceLevel;
  benchmarkStatus: FactBenchmarkStatus;
  genericityScore: number;
  actionabilityScore: number;
  denominatorRisk: FactDenominatorRisk;
  requiresCaution: boolean;
};

export type TerritoryAnalysisContext = {
  territory: import("../types").TerritoryProfile;
  territoryContext?: import("./context/buildTerritoryContext").TerritoryContext;
};

export type QualifiedAnalysisFact = AnalysisFact & {
  polarity: FactPolarity;
  intensity: FactIntensity;
  eligibleTargets: AnalysisFactTarget[];
  qualificationReason?: string;
} & FactProgressiveQualification;

export type NumericBinding = {
  value: number | string;
  label: string;
  unit?: string;
  theme: AnalysisFactTheme;
  allowedContexts: string[];
};

/** Fragment rédigé pour insertion dans le résumé déterministe (jamais un label interne). */
export type AnalysisFactSummaryFragments = {
  /** Groupe nominal après « met en évidence » — article inclus. */
  summaryAssetPhrase?: string;
  /** Groupe nominal (nominatif) — affichage autonome ou référence interne. */
  summaryIssuePhrase?: string;
  /** Forme après « à » avec contractions (ex. au chômage, à la vacance). */
  summaryIssueAfterA?: string;
  /** Contexte démographique ou complément après « met en évidence ». */
  summaryContextPhrase?: string;
};

export type AnalysisFact = {
  id: string;
  theme: AnalysisFactTheme;
  target: AnalysisFactTarget;
  sentence: string;
  evidence: string[];
  sourceKeys: string[];
  year?: number | string;
  confidence: AnalysisFactConfidence;
  limitations?: string[];
  numericBindings?: NumericBinding[];
} & AnalysisFactSummaryFragments;

export type RawTerritorialAnalysisOutput = {
  summary?: string;
  strengths?: string[];
  watchPoints?: string[];
  opportunities?: string[];
};
