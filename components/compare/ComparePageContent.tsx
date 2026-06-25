import Link from "next/link";
import { Suspense } from "react";
import type { TerritoryComparisonResult } from "@/lib/compare/types";
import { MIN_COMPARE_COMMUNES } from "@/lib/compare/parse-codes";
import { ShareCompareActions } from "./CompareHighlights";
import { CompareSelector } from "./CompareSelector";
import { CompareResults } from "./CompareResults";

interface ComparePageContentProps {
  selectedCodes: string[];
  selectedNames: Record<string, string>;
  comparison: TerritoryComparisonResult | null;
  notFoundCodes: string[];
}

export function ComparePageContent({
  selectedCodes,
  selectedNames,
  comparison,
  notFoundCodes,
}: ComparePageContentProps) {
  const communeNames = selectedCodes.map((code) => selectedNames[code] ?? code);

  return (
    <main
      id="compare-main"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 print:max-w-none print:py-4"
    >
      {comparison ? (
        <div className="hidden print:block print:rounded-lg print:border print:border-slate-400 print:p-4">
          <p className="text-lg font-semibold text-black">
            Comparaison : {communeNames.join(", ")}
          </p>
          <p className="mt-1 text-sm text-black">
            Portrait de territoire — tableau comparatif imprimable. Chaque valeur
            reprend sa source et son millésime dans le détail du tableau.
          </p>
        </div>
      ) : null}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex text-sm text-blue-700 hover:underline print:hidden"
          >
            ← Accueil
          </Link>
          {comparison ? (
            <Suspense fallback={null}>
              <ShareCompareActions
                communeNames={communeNames}
                selectedCodes={selectedCodes}
              />
            </Suspense>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
            Comparateur communal
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Comparer des communes
          </h1>
          <p className="mt-2 max-w-3xl text-base text-slate-600">
            Comparez 2 à 5 communes sur les questions du quotidien : famille,
            logement, emploi, équipements, accessibilité et dynamique. Chaque
            chiffre est sourcé — pas de score global.
          </p>
        </div>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-slate-500">Chargement du sélecteur de communes…</p>
        }
      >
        <CompareSelector selectedCodes={selectedCodes} selectedNames={selectedNames} />
      </Suspense>

      {notFoundCodes.length > 0 ? (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          Commune(s) introuvable(s) : {notFoundCodes.join(", ")}.
        </p>
      ) : null}

      {selectedCodes.length < MIN_COMPARE_COMMUNES ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Ajoutez au moins {MIN_COMPARE_COMMUNES} communes pour afficher le
          tableau comparatif.
        </p>
      ) : null}

      {comparison ? (
        <Suspense
          fallback={
            <p className="text-sm text-slate-500">Chargement de la comparaison…</p>
          }
        >
          <CompareResults comparison={comparison} />
        </Suspense>
      ) : null}
    </main>
  );
}
