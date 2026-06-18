import type {
  AnalysisFact,
  AnalysisFactConfidence,
  AnalysisFactSummaryFragments,
  AnalysisFactTarget,
  AnalysisFactTheme,
  NumericBinding,
} from "../types";

let factCounter = 0;

export function resetFactCounter(): void {
  factCounter = 0;
}

export function nextFactId(theme: AnalysisFactTheme): string {
  factCounter += 1;
  return `${theme}-${factCounter}`;
}

type CreateFactInput = {
  theme: AnalysisFactTheme;
  target: AnalysisFactTarget;
  sentence: string;
  evidence?: string[];
  sourceKeys: string[];
  year?: number | string;
  confidence?: AnalysisFactConfidence;
  limitations?: string[];
  numericBindings?: NumericBinding[];
} & AnalysisFactSummaryFragments;

export function createFact(input: CreateFactInput): AnalysisFact {
  return {
    id: nextFactId(input.theme),
    theme: input.theme,
    target: input.target,
    sentence: input.sentence,
    evidence: input.evidence ?? [],
    sourceKeys: input.sourceKeys,
    year: input.year,
    confidence: input.confidence ?? "high",
    limitations: input.limitations,
    numericBindings: input.numericBindings,
    summaryAssetPhrase: input.summaryAssetPhrase,
    summaryIssuePhrase: input.summaryIssuePhrase,
    summaryIssueAfterA: input.summaryIssueAfterA,
    summaryContextPhrase: input.summaryContextPhrase,
  };
}

export function binding(
  value: number | string,
  label: string,
  theme: AnalysisFactTheme,
  allowedContexts: string[],
  unit?: string,
): NumericBinding {
  return { value, label, unit, theme, allowedContexts };
}
