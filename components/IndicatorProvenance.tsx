import { getSourceUrlById } from "@/lib/sources";

export interface IndicatorProvenanceProps {
  label: string;
  definition: string;
  sourceId: string;
  sourceName: string;
  vintage?: number | string | null;
  readingAlert?: string | null;
  comparisonHint?: string | null;
  fragile?: boolean;
  warning?: string | null;
  inlineSource?: boolean;
}

export function IndicatorProvenance({
  label,
  definition,
  sourceId,
  sourceName,
  vintage = null,
  readingAlert = null,
  comparisonHint = null,
  fragile = false,
  warning = null,
  inlineSource = false,
}: IndicatorProvenanceProps) {
  const url = getSourceUrlById(sourceId);
  const sourceLabel = url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-700 underline-offset-2 hover:underline"
    >
      {sourceName}
    </a>
  ) : (
    sourceName
  );
  const vintageLabel = vintage != null ? ` · ${vintage}` : "";

  return (
    <div className="space-y-1">
      <div className="font-medium text-slate-900">{label}</div>
      <p className="text-xs leading-relaxed text-slate-600">{definition}</p>
      {readingAlert ? (
        <p className="text-xs text-amber-800">{readingAlert}</p>
      ) : null}
      {comparisonHint ? (
        <p className="text-xs text-slate-600">{comparisonHint}</p>
      ) : null}
      {inlineSource ? (
        <p className="text-xs text-slate-500">
          Source : {sourceLabel}
          {vintageLabel}
        </p>
      ) : (
        <p className="block text-xs text-slate-500 print:text-[10px]">
          Source : {sourceLabel}
          {vintageLabel}
        </p>
      )}
      {fragile ? <p className="text-xs text-amber-800">Donnée fragile</p> : null}
      {warning ? <p className="text-xs text-amber-800">{warning}</p> : null}
    </div>
  );
}
