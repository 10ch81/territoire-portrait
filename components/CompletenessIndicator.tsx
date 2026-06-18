import type { CompletenessResult } from "@/lib/ux/completeness";

interface CompletenessIndicatorProps {
  completeness: CompletenessResult;
}

export function CompletenessIndicator({
  completeness,
}: CompletenessIndicatorProps) {
  const tone =
    completeness.percent >= 75
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : completeness.percent >= 50
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${tone}`}
      title="Nombre de familles thématiques de données enrichies disponibles pour cette commune (distinct du détail des sources listées)"
    >
      <span
        className="inline-block h-2 w-2 rounded-full bg-current opacity-60"
        aria-hidden
      />
      {completeness.label}
    </div>
  );
}
