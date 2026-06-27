import type { CommunePortraitResult } from "@/lib/compare/single-portrait";
import { isSensitiveIndicator } from "@/lib/indicators/types";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCommuneIndicatorsCsv(portrait: CommunePortraitResult): string {
  const header = [
    "id",
    "label",
    "value",
    "sourceId",
    "sourceName",
    "vintage",
    "scale",
    "block",
    "definition",
  ].join(",");

  const rows: string[] = [header];

  for (const block of portrait.blocks) {
    for (const indicator of block.indicators) {
      if (!indicator.available) {
        continue;
      }
      if (indicator.sensitive || isSensitiveIndicator(indicator.id)) {
        continue;
      }
      rows.push(
        [
          indicator.id,
          indicator.label,
          indicator.displayValue,
          indicator.sourceId,
          indicator.sourceName,
          indicator.vintage != null ? String(indicator.vintage) : "",
          indicator.scale,
          block.label,
          indicator.definition,
        ]
          .map((cell) => escapeCsv(cell))
          .join(","),
      );
    }
  }

  return rows.join("\n");
}
