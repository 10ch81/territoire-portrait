import type { AgeBandCount } from "@/lib/types";

interface AgePyramidChartProps {
  ageBands: AgeBandCount[];
}

export function AgePyramidChart({ ageBands }: AgePyramidChartProps) {
  const withShare = ageBands.filter((b) => b.sharePercent != null);
  if (withShare.length === 0) {
    return null;
  }

  const maxShare = Math.max(
    ...withShare.map((b) => b.sharePercent as number),
  );

  return (
    <figure className="mt-4 space-y-2" aria-label="Structure par tranche d'âge">
      {withShare.map((band) => {
        const share = band.sharePercent as number;
        const widthPercent = maxShare > 0 ? (share / maxShare) * 100 : 0;

        return (
          <div key={band.label} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 text-slate-600">{band.label}</span>
            <div className="relative h-5 flex-1 rounded bg-slate-100">
              <div
                className="absolute inset-y-0 left-0 rounded bg-blue-600/80"
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-slate-700">
              {share.toFixed(1)} %
            </span>
          </div>
        );
      })}
    </figure>
  );
}
