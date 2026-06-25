export { buildTerritoryComparison, getCell } from "./build-comparison";
export { getIndicatorRows } from "./indicator-rows";
export { buildCommunePortrait } from "./single-portrait";
export type {
  CommunePortraitBlock,
  CommunePortraitIndicator,
  CommunePortraitResult,
} from "./single-portrait";
export {
  findComparableCommunes,
  MAX_COMPARABLE_SUGGESTIONS,
  POPULATION_TOLERANCE_RATIO,
} from "./comparable";
export type {
  ComparableCommuneSuggestion,
  ComparableCommunesResult,
} from "./comparable";
export { COMPARE_BLOCKS, COMPARE_INDICATORS, COMPARE_INDICATOR_MAP } from "./indicators";
export { buildCompareHighlights } from "./highlights";
export { COMPARE_THEMATIC_PROFILES } from "./profiles";
export {
  buildCompareUrl,
  isValidInseeCode,
  MAX_COMPARE_COMMUNES,
  MIN_COMPARE_COMMUNES,
  normalizeInseeCode,
  parseCompareCodesParam,
} from "./parse-codes";
export type {
  CompareBlock,
  CompareBlockId,
  CompareCell,
  CompareHighlight,
  CompareIndicatorDefinition,
  CompareIndicatorMeta,
  CompareQuestionId,
  CompareValueType,
  TerritoryComparisonColumn,
  TerritoryComparisonResult,
} from "./types";
