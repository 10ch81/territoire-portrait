import type { TerritoryProfile } from "@/lib/types";

export type CompareBlockId =
  | "identity"
  | "population"
  | "housing"
  | "income_employment"
  | "services"
  | "dynamics"
  | "fiscalite";

export type CompareQuestionId =
  | "family"
  | "housing"
  | "socioeconomic"
  | "equipped"
  | "accessible"
  | "dynamic"
  | "territorial_context"
  | "fiscal"
  | "collectivity"
  | "implantation";

export type CompareValueType = "absolute" | "ratio" | "evolution" | "rank" | "text";

export type CompareGeographicScale = "commune" | "epci" | "dept" | "region";

export interface CompareIndicatorMeta {
  id: string;
  label: string;
  definition: string;
  blockId: CompareBlockId;
  questionIds: CompareQuestionId[];
  sourceId: string;
  sourceName: string;
  valueType: CompareValueType;
  scale: CompareGeographicScale;
  sensitive: boolean;
  /** Mise en garde de lecture (millésime, comparabilité limitée). */
  readingAlert?: string | null;
  /** Conseil pour comparer cet indicateur entre communes. */
  comparisonHint?: string | null;
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
  departmentRankLabel?: string | null;
}

export interface CompareBlock {
  id: CompareBlockId;
  label: string;
  indicatorIds: string[];
}

export interface CompareHighlight {
  profileId: string;
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
