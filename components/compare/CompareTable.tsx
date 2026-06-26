import { getIndicatorRows } from "@/lib/compare/indicator-rows";
import type { CompareCell, TerritoryComparisonResult } from "@/lib/compare/types";
import { getSourceUrlById } from "@/lib/sources";
import {
  buildCompareCellAccessibleName,
  buildCompareTableCaption,
  compareColumnHeaderId,
  compareIndicatorHeaderId,
  compareSectionHeadingId,
} from "@/lib/ux/compare-a11y";

interface CompareTableProps {
  comparison: TerritoryComparisonResult;
  hiddenIndicatorIds?: Set<string>;
}

function SourceReference({
  sourceId,
  sourceName,
  inline = false,
}: {
  sourceId: string;
  sourceName: string;
  inline?: boolean;
}) {
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
  const content = <>Source : {sourceLabel}</>;

  if (inline) {
    return <span className="text-xs text-slate-500">{content}</span>;
  }

  return <p className="block text-xs text-slate-500 print:text-[10px]">{content}</p>;
}

function IndicatorMeta({
  label,
  definition,
  sourceId,
  sourceName,
  vintage,
}: {
  label: string;
  definition: string;
  sourceId: string;
  sourceName: string;
  vintage: number | string | null;
}) {
  const vintageLabel = vintage != null ? ` · ${vintage}` : "";
  return (
    <div className="space-y-1">
      <div className="font-medium text-slate-900">{label}</div>
      <p className="text-xs leading-relaxed text-slate-600">{definition}</p>
      <p className="text-xs text-slate-500">
        <SourceReference sourceId={sourceId} sourceName={sourceName} inline />
        {vintageLabel}
      </p>
    </div>
  );
}

function CellValue({
  cell,
  communeName,
  indicatorLabel,
  sourceId,
  sourceName,
}: {
  cell: CompareCell | undefined;
  communeName: string;
  indicatorLabel: string;
  sourceId: string;
  sourceName: string;
}) {
  const accessibleName = buildCompareCellAccessibleName({
    communeName,
    indicatorLabel,
    cell,
  });

  if (!cell || !cell.available) {
    return (
      <span className="text-slate-500" aria-label={accessibleName}>
        —
      </span>
    );
  }

  return (
    <div className="space-y-1" aria-label={accessibleName}>
      <span className="font-medium text-slate-900">{cell.displayValue}</span>
      {cell.vintage != null ? (
        <span className="block text-xs text-slate-500">Millésime {cell.vintage}</span>
      ) : null}
      <SourceReference sourceId={sourceId} sourceName={sourceName} />
      {cell.fragile ? (
        <span className="block text-xs text-amber-800">Donnée fragile</span>
      ) : null}
      {cell.warning ? (
        <span className="block text-xs text-amber-800">{cell.warning}</span>
      ) : null}
      {cell.departmentRankLabel ? (
        <span className="block text-xs text-slate-600">{cell.departmentRankLabel}</span>
      ) : null}
    </div>
  );
}

export function CompareTable({ comparison, hiddenIndicatorIds }: CompareTableProps) {
  const communeNames = comparison.columns.map((column) => column.name);
  const tableCaption = buildCompareTableCaption(communeNames);

  return (
    <div className="space-y-8">
      {comparison.blocks.map((block) => {
        const rows = getIndicatorRows(comparison, block.id, { hiddenIndicatorIds });
        if (rows.length === 0) {
          return null;
        }

        const sectionHeadingId = compareSectionHeadingId(block.id);

        return (
          <section
            key={block.id}
            id={`compare-${block.id}`}
            aria-labelledby={sectionHeadingId}
            className="scroll-mt-20 space-y-3"
          >
            <h2 id={sectionHeadingId} className="text-lg font-semibold text-slate-900">
              {block.label}
            </h2>
            <div
              className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 print:overflow-visible print:shadow-none"
              role="region"
              aria-label={`${block.label} — ${tableCaption}`}
              tabIndex={0}
            >
              <table className="compare-table min-w-full text-sm">
                <caption className="compare-table-caption px-4 py-3 text-left text-sm text-slate-600">
                  {tableCaption} Bloc : {block.label}.
                </caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th
                      scope="col"
                      className="min-w-[220px] px-4 py-3 text-left font-semibold text-slate-800"
                    >
                      Indicateur
                    </th>
                    {comparison.columns.map((column) => (
                      <th
                        key={column.inseeCode}
                        id={compareColumnHeaderId(block.id, column.inseeCode)}
                        scope="col"
                        className="min-w-[140px] px-4 py-3 text-left font-semibold text-slate-800"
                      >
                        <a
                          href={column.profileLink}
                          className="text-blue-800 underline-offset-2 hover:underline focus-visible:underline"
                        >
                          {column.name}
                        </a>
                        {column.departmentLabel ? (
                          <span className="mt-0.5 block text-xs font-normal text-slate-600">
                            {column.departmentLabel}
                          </span>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ indicator, cellsByCommune }) => {
                    const sampleCell = cellsByCommune.values().next().value;
                    const indicatorHeaderId = compareIndicatorHeaderId(block.id, indicator.id);

                    return (
                      <tr
                        key={indicator.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <th
                          scope="row"
                          id={indicatorHeaderId}
                          className="px-4 py-3 align-top text-left"
                        >
                          <IndicatorMeta
                            label={indicator.label}
                            definition={indicator.definition}
                            sourceId={indicator.sourceId}
                            sourceName={indicator.sourceName}
                            vintage={sampleCell?.vintage ?? null}
                          />
                        </th>
                        {comparison.columns.map((column) => {
                          const headerIds = [
                            indicatorHeaderId,
                            compareColumnHeaderId(block.id, column.inseeCode),
                          ].join(" ");

                          return (
                            <td
                              key={column.inseeCode}
                              headers={headerIds}
                              className="px-4 py-3 align-top"
                            >
                              <CellValue
                                cell={cellsByCommune.get(column.inseeCode)}
                                communeName={column.name}
                                indicatorLabel={indicator.label}
                                sourceId={indicator.sourceId}
                                sourceName={indicator.sourceName}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
