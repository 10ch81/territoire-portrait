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
  buildIncomeWatchPointSentence,
  isEligibleForWatchPoint,
  isFactEligibleForWatchPoint,
  qualifyAnalysisFact,
  qualifyAnalysisFacts,
  qualifiedWatchPointCandidates,
} from "./qualify-facts";
export {
  buildOpportunityCandidates,
  dedupeOpportunityCandidates,
  scoreOpportunityCandidate,
  selectOpportunities,
  selectOpportunityFacts,
} from "./opportunities";
export type {
  OpportunityActionFamily,
  OpportunityCandidate,
  OpportunityKind,
  OpportunityLevel,
  OpportunitySelectionContext,
} from "./opportunities";
export type {
  FactIntensity,
  FactPolarity,
  QualifiedAnalysisFact,
  TerritoryAnalysisContext,
} from "./types";
export {
  hasCriticalValidationIssue,
  validateAnalysisOutput,
} from "./validate-output";
export {
  enforceFinalAnalysisInvariants,
  hasFinalInternalLeakage,
  stripFinalInternalLeakage,
} from "./enforce-final-invariants";

export {
  hasForbiddenDerivedRatio,
} from "./verify-numeric-claims";
export { formatCount, formatPercent, formatPricePerM2, formatSignedPercent } from "./format";
