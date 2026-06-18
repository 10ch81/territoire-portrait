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
  | "finances";

export type AnalysisFactTarget =
  | "summary"
  | "strengths"
  | "watchPoints"
  | "opportunities";

export type AnalysisFactConfidence = "high" | "medium" | "low";

export type NumericBinding = {
  value: number | string;
  label: string;
  unit?: string;
  theme: AnalysisFactTheme;
  allowedContexts: string[];
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
};

export type RawTerritorialAnalysisOutput = {
  summary?: string;
  strengths?: string[];
  watchPoints?: string[];
  opportunities?: string[];
};
