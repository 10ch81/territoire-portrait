import type { CommunePortraitResult } from "@/lib/compare/single-portrait";

interface PortraitBlocksProps {
  portrait: CommunePortraitResult;
}

export function PortraitBlocks({ portrait }: PortraitBlocksProps) {
  return (
    <div className="space-y-6">
      {portrait.blocks.map((block) => {
        const visibleIndicators = block.indicators.filter((item) => item.available);
        if (visibleIndicators.length === 0) {
          return null;
        }

        return (
          <section
            key={block.id}
            id={`portrait-${block.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">{block.label}</h2>
            <dl className="mt-4 divide-y divide-slate-100">
              {visibleIndicators.map((indicator) => (
                <div key={indicator.id} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
                  <div>
                    <dt className="font-medium text-slate-800">{indicator.label}</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-slate-500">
                      {indicator.definition}
                    </dd>
                    <dd className="mt-1 text-xs text-slate-400">
                      Source : {indicator.sourceName}
                      {indicator.vintage != null ? ` · ${indicator.vintage}` : ""}
                    </dd>
                    {indicator.fragile ? (
                      <p className="mt-1 text-xs text-amber-700">Donnée fragile</p>
                    ) : null}
                    {indicator.warning ? (
                      <p className="mt-1 text-xs text-amber-700">{indicator.warning}</p>
                    ) : null}
                  </div>
                  <dd className="text-right text-base font-semibold text-slate-900 sm:pt-0.5">
                    {indicator.displayValue}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
