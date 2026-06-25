import type { CompareCell, TerritoryComparisonResult } from "@/lib/compare";
import { getIndicatorRows } from "@/lib/compare";

interface CompareTableProps {
  comparison: TerritoryComparisonResult;
}

function IndicatorMeta({
  label,
  definition,
  sourceName,
  vintage,
}: {
  label: string;
  definition: string;
  sourceName: string;
  vintage: number | string | null;
}) {
  const vintageLabel = vintage != null ? ` · ${vintage}` : "";
  return (
    <div className="space-y-1">
      <div className="font-medium text-slate-800">{label}</div>
      <p className="text-xs leading-relaxed text-slate-500">{definition}</p>
      <p className="text-xs text-slate-400">
        Source : {sourceName}
        {vintageLabel}
      </p>
    </div>
  );
}

function CellValue({ cell }: { cell: CompareCell | undefined }) {
  if (!cell || !cell.available) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className="space-y-1">
      <span className="font-medium text-slate-900">{cell.displayValue}</span>
      {cell.vintage != null ? (
        <span className="block text-xs text-slate-400">{cell.vintage}</span>
      ) : null}
      {cell.fragile ? (
        <span className="block text-xs text-amber-700">Donnée fragile</span>
      ) : null}
      {cell.warning ? (
        <span className="block text-xs text-amber-700">{cell.warning}</span>
      ) : null}
    </div>
  );
}

export function CompareTable({ comparison }: CompareTableProps) {
  return (
    <div className="space-y-8">
      {comparison.blocks.map((block) => {
        const rows = getIndicatorRows(comparison, block.id);
        if (rows.length === 0) {
          return null;
        }

        return (
          <section key={block.id} id={`compare-${block.id}`} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{block.label}</h2>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th
                      scope="col"
                      className="min-w-[220px] px-4 py-3 text-left font-semibold text-slate-700"
                    >
                      Indicateur
                    </th>
                    {comparison.columns.map((column) => (
                      <th
                        key={column.inseeCode}
                        scope="col"
                        className="min-w-[140px] px-4 py-3 text-left font-semibold text-slate-700"
                      >
                        <a
                          href={column.profileLink}
                          className="text-blue-700 hover:underline"
                        >
                          {column.name}
                        </a>
                        {column.departmentLabel ? (
                          <span className="mt-0.5 block text-xs font-normal text-slate-500">
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
                    return (
                      <tr
                        key={indicator.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <th scope="row" className="px-4 py-3 align-top text-left">
                          <IndicatorMeta
                            label={indicator.label}
                            definition={indicator.definition}
                            sourceName={indicator.sourceName}
                            vintage={sampleCell?.vintage ?? null}
                          />
                        </th>
                        {comparison.columns.map((column) => (
                          <td key={column.inseeCode} className="px-4 py-3 align-top">
                            <CellValue cell={cellsByCommune.get(column.inseeCode)} />
                          </td>
                        ))}
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
