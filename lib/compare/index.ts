export { buildTerritoryComparison, getCell, getIndicatorRows } from "./build-comparison";
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
