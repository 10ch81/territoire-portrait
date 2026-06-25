import Link from "next/link";
import type { ComparableCommunesResult } from "@/lib/compare/comparable";
import { buildCompareUrl } from "@/lib/compare/parse-codes";
import { formatPopulation } from "@/lib/territory";

interface ComparableCommunesPanelProps {
  currentInseeCode: string;
  currentName: string;
  comparable: ComparableCommunesResult;
}

export function ComparableCommunesPanel({
  currentInseeCode,
  currentName,
  comparable,
}: ComparableCommunesPanelProps) {
  const compareCodes = [
    currentInseeCode,
    ...comparable.suggestions.map((item) => item.inseeCode),
  ].slice(0, 5);

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-base font-semibold text-slate-900">Communes comparables</h2>
      <p className="mt-1 text-sm text-slate-600">{comparable.criteriaLabel}</p>

      {comparable.available ? (
        <>
          <ul className="mt-4 space-y-2">
            {comparable.suggestions.map((commune) => (
              <li key={commune.inseeCode}>
                <Link
                  href={`/commune/${commune.inseeCode}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm transition hover:border-blue-300"
                >
                  <span className="font-medium text-slate-900">{commune.name}</span>
                  <span className="text-slate-500">
                    {commune.population != null
                      ? formatPopulation(commune.population)
                      : "Population n.d."}
                    {commune.populationDeltaPercent != null
                      ? ` (${commune.populationDeltaPercent > 0 ? "+" : ""}${commune.populationDeltaPercent} % vs ${currentName})`
                      : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={buildCompareUrl(compareCodes)}
            className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Comparer {currentName} avec ces communes →
          </Link>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          {comparable.note ??
            "Aucune suggestion disponible — utilisez le comparateur pour choisir d'autres communes."}
        </p>
      )}
    </section>
  );
}
