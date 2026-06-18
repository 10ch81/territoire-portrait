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
  buildCanonicalAnalysisOutput,
  buildDeterministicSummary,
  buildVerbatimLists,
  inferFactOrder,
  resolveVerbatimList,
} from "./build-canonical-output";
export {
  ANALYSIS_OUTPUT_LIMITS,
  buildExpectedOutputInstructions,
  buildMistralStructureBlock,
} from "./prompt-limits";
export {
  groupFactsByTarget,
  selectAnalysisFactsForPrompt,
} from "./select-facts";
export {
  areSemanticallySimilar,
  compareFactQuality,
  dedupeFactsForTarget,
  dedupeSelectedFacts,
  hasDuplicateIndicatorInTarget,
  indicatorKeys,
} from "./dedupe-facts";
export {
  isActionableOpportunity,
  isStudyOnlyFact,
  scoreAnalysisFact,
} from "./score-facts";
export {
  hasCriticalValidationIssue,
  validateAnalysisOutput,
} from "./validate-output";

export {
  hasForbiddenDerivedRatio,
} from "./verify-numeric-claims";
export { formatCount, formatPercent, formatPricePerM2, formatSignedPercent } from "./format";
