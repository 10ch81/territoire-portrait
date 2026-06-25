import type { CompareCell } from "@/lib/compare/types";

export function buildCompareTableCaption(communeNames: string[]): string {
  return `Tableau comparatif des communes : ${communeNames.join(", ")}.`;
}

export function buildCompareCellAccessibleName(input: {
  communeName: string;
  indicatorLabel: string;
  cell: CompareCell | undefined;
}): string {
  if (!input.cell?.available) {
    return `${input.indicatorLabel} — ${input.communeName} : donnée non disponible`;
  }

  const parts = [
    input.indicatorLabel,
    input.communeName,
    input.cell.displayValue,
  ];

  if (input.cell.vintage != null) {
    parts.push(`millésime ${input.cell.vintage}`);
  }
  if (input.cell.fragile) {
    parts.push("donnée fragile");
  }
  if (input.cell.warning) {
    parts.push(input.cell.warning);
  }
  if (input.cell.departmentRankLabel) {
    parts.push(input.cell.departmentRankLabel);
  }

  return parts.join(" — ");
}

export function compareColumnHeaderId(blockId: string, inseeCode: string): string {
  return `compare-${blockId}-col-${inseeCode}`;
}

export function compareIndicatorHeaderId(blockId: string, indicatorId: string): string {
  return `compare-${blockId}-indicator-${indicatorId}`;
}

export function compareSectionHeadingId(blockId: string): string {
  return `compare-${blockId}-heading`;
}
