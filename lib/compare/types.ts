import type { TerritoryProfile } from "@/lib/types";

export type CompareBlockId =
  | "identity"
  | "population"
  | "housing"
  | "income_employment"
  | "services"
  | "dynamics";

export type CompareQuestionId =
  | "family"
  | "housing"
  | "socioeconomic"
  | "equipped"
  | "accessible"
  | "dynamic"
  | "territorial_context";

export type CompareValueType = "absolute" | "ratio" | "evolution" | "rank" | "text";

export interface CompareIndicatorMeta {
  id: string;
  label: string;
  definition: string;
  blockId: CompareBlockId;
  questionIds: CompareQuestionId[];
  sourceId: string;
  sourceName: string;
  valueType: CompareValueType;
  /** Pour le tri des highlights — null = neutre ou texte. */
  higherIsBetter: boolean | null;
}

export interface CompareCell {
  indicatorId: string;
  communeInsee: string;
  displayValue: string;
  numericValue: number | null;
  vintage: number | string | null;
  fragile: boolean;
  warning: string | null;
  available: boolean;
}

export interface CompareBlock {
  id: CompareBlockId;
  label: string;
  indicatorIds: string[];
}

export interface CompareHighlight {
  profileLabel: string;
  sentence: string;
  indicatorId: string;
}

export interface TerritoryComparisonColumn {
  inseeCode: string;
  name: string;
  departmentLabel: string | null;
  profileLink: string;
}

export interface TerritoryComparisonResult {
  columns: TerritoryComparisonColumn[];
  blocks: CompareBlock[];
  cells: CompareCell[];
  highlights: CompareHighlight[];
  warnings: string[];
}

export type CompareIndicatorExtractor = (
  territory: TerritoryProfile,
) => Pick<
  CompareCell,
  "displayValue" | "numericValue" | "vintage" | "fragile" | "warning" | "available"
>;

export interface CompareIndicatorDefinition extends CompareIndicatorMeta {
  extract: CompareIndicatorExtractor;
}
