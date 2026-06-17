import type { PopulationYearCount } from "@/lib/types";

interface PopulationChartProps {
  history: PopulationYearCount[];
}

export function PopulationChart({ history }: PopulationChartProps) {
  if (history.length < 2) {
    return null;
  }

  const width = 320;
  const height = 120;
  const padding = { top: 8, right: 8, bottom: 24, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const populations = history.map((p) => p.population);
  const minPop = Math.min(...populations);
  const maxPop = Math.max(...populations);
  const range = maxPop - minPop || 1;

  const points = history.map((point, index) => {
    const x =
      padding.left + (index / (history.length - 1)) * innerW;
    const y =
      padding.top + innerH - ((point.population - minPop) / range) * innerH;
    return { x, y, ...point };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <figure className="mt-4" aria-label="Évolution de la population">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full max-w-sm text-blue-700"
        role="img"
      >
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <g key={p.year}>
            <circle cx={p.x} cy={p.y} r="3" fill="currentColor" />
            <text
              x={p.x}
              y={height - 4}
              textAnchor="middle"
              className="fill-slate-500 text-[10px]"
            >
              {p.year}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">
        Courbe d&apos;évolution de la population de {history[0]?.year} à{" "}
        {history[history.length - 1]?.year}
      </figcaption>
    </figure>
  );
}
