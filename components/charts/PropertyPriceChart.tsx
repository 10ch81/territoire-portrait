import type { PropertyYearPrice } from "@/lib/types";
import { formatPropertyPrice } from "@/lib/enrichment";

interface PropertyPriceChartProps {
  history: PropertyYearPrice[];
}

export function PropertyPriceChart({ history }: PropertyPriceChartProps) {
  const valid = history.filter((p) => p.averagePricePerM2 != null);
  if (valid.length < 2) {
    return null;
  }

  const width = 320;
  const height = 120;
  const padding = { top: 8, right: 8, bottom: 24, left: 8 };
  const barGap = 4;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const barWidth = (innerW - barGap * (valid.length - 1)) / valid.length;

  const prices = valid.map((p) => p.averagePricePerM2 as number);
  const maxPrice = Math.max(...prices);

  return (
    <figure className="mt-4" aria-label="Évolution du prix au mètre carré">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full max-w-sm"
        role="img"
      >
        {valid.map((point, index) => {
          const price = point.averagePricePerM2 as number;
          const barH = (price / maxPrice) * innerH;
          const x = padding.left + index * (barWidth + barGap);
          const y = padding.top + innerH - barH;

          return (
            <g key={point.year}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                className="fill-blue-600"
                rx="2"
              />
              <text
                x={x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                className="fill-slate-500 text-[10px]"
              >
                {point.year}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-xs text-slate-500">
        Dernier prix :{" "}
        {formatPropertyPrice(
          valid[valid.length - 1]?.averagePricePerM2 ?? null,
          valid[valid.length - 1]?.mutationCount ?? null,
        )}
      </figcaption>
    </figure>
  );
}
