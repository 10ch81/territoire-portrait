export type {
  AnalysisFact,
  AnalysisFactConfidence,
  AnalysisFactTarget,
  AnalysisFactTheme,
  NumericBinding,
  RawTerritorialAnalysisOutput,
} from "./types";

export { buildAnalysisFacts } from "./build-analysis-facts";
export {
  groupFactsByTarget,
  selectAnalysisFactsForPrompt,
} from "./select-facts";
export {
  isActionableOpportunity,
  isStudyOnlyFact,
  scoreAnalysisFact,
} from "./score-facts";
export {
  hasCriticalValidationIssue,
  validateAnalysisOutput,
} from "./validate-output";

export { formatCount, formatPercent, formatPricePerM2, formatSignedPercent } from "./format";
