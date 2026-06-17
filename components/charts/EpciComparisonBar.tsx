import { formatDensity } from "@/lib/enrichment";
import { formatPopulation } from "@/lib/territory";
import type { EpciComparisonSnapshot } from "@/lib/types";

interface EpciComparisonBarProps {
  comparison: EpciComparisonSnapshot;
  communePopulation: number | null;
  communeDensity: number | null;
}

function ComparisonRow({
  label,
  communeValue,
  epciAverage,
  rank,
  total,
  format,
}: {
  label: string;
  communeValue: number | null;
  epciAverage: number | null;
  rank: number | null;
  total: number;
  format: (v: number | null) => string;
}) {
  if (communeValue == null || epciAverage == null || epciAverage === 0) {
    return null;
  }

  const ratio = Math.min(communeValue / epciAverage, 2);
  const widthPercent = (ratio / 2) * 100;
  const avgWidthPercent = 50;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        {rank != null ? (
          <span className="text-slate-500">
            Rang {rank}/{total}
          </span>
        ) : null}
      </div>
      <div className="relative h-6 rounded bg-slate-100">
        <div
          className="absolute inset-y-0 left-0 rounded bg-blue-600/80"
          style={{ width: `${widthPercent}%` }}
          title={`Commune : ${format(communeValue)}`}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
          style={{ left: `${avgWidthPercent}%` }}
          title={`Moyenne EPCI : ${format(epciAverage)}`}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Commune : {format(communeValue)}</span>
        <span>Moy. EPCI : {format(epciAverage)}</span>
      </div>
    </div>
  );
}

export function EpciComparisonBar({
  comparison,
  communePopulation,
  communeDensity,
}: EpciComparisonBarProps) {
  if (!comparison.available) {
    return null;
  }

  return (
    <figure className="mt-4 space-y-4" aria-label="Comparaison avec la moyenne EPCI">
      <ComparisonRow
        label="Population"
        communeValue={communePopulation}
        epciAverage={comparison.epciAveragePopulation}
        rank={comparison.communeRankByPopulation}
        total={comparison.communeCount}
        format={formatPopulation}
      />
      <ComparisonRow
        label="Densité"
        communeValue={communeDensity}
        epciAverage={comparison.epciAverageDensity}
        rank={comparison.communeRankByDensity}
        total={comparison.communeCount}
        format={formatDensity}
      />
      <figcaption className="text-xs text-slate-500">{comparison.note}</figcaption>
    </figure>
  );
}
