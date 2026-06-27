import type { KpiItem } from "@/lib/ux/kpis";

interface KpiHeroProps {
  kpis: KpiItem[];
}

export function KpiHero({ kpis }: KpiHeroProps) {
  if (kpis.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Indicateurs clés"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      {kpis.map((kpi) => (
        <article
          key={kpi.id}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {kpi.label}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{kpi.value}</p>
          {kpi.hint ? (
            <p className="mt-0.5 truncate text-xs text-slate-400" title={kpi.hint}>
              {kpi.hint}
            </p>
          ) : null}
          {kpi.benchmarkHint ? (
            <p className="mt-0.5 text-xs text-blue-700" title={kpi.benchmarkHint}>
              {kpi.benchmarkHint}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
