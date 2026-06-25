import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { UseCaseCards } from "@/components/UseCaseCards";
import { buildCompareUrl } from "@/lib/compare";
import { COMPARE_EXAMPLE_CODES, COMPARE_EXAMPLE_LABEL } from "@/lib/ux/recent-communes";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
          Portrait territorial
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Où habiter ? Comparez des communes
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-slate-600">
          Comparez 2 à 5 communes sur la vie quotidienne — famille, logement,
          emploi, équipements — à partir de données publiques sourcées. Ou
          consultez une fiche détaillée avec analyse IA prudente.
        </p>
        <Link
          href={buildCompareUrl([...COMPARE_EXAMPLE_CODES])}
          className="inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800"
        >
          Comparer {COMPARE_EXAMPLE_LABEL} →
        </Link>
      </header>

      <SearchForm />
      <SearchSuggestions />
      <UseCaseCards />

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Comment ça marche
        </h2>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-slate-600">
          <li>Résolution de la commune via l&apos;API Géo (data.gouv.fr).</li>
          <li>Affichage des données disponibles — sans invention.</li>
          <li>Analyse Mistral côté serveur, à partir des faits fournis.</li>
        </ol>
        <p className="mt-4 text-sm text-slate-500">
          Feuille de route UX :{" "}
          <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">
            docs/ux-roadmap.md
          </code>
        </p>
      </section>
    </main>
  );
}
