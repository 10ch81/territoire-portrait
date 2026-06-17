import { SearchForm } from "@/components/SearchForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
          MVP — Portrait territorial
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Portrait IA de territoire
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-slate-600">
          Saisissez une commune française pour générer une fiche claire à partir
          de données publiques, enrichie d&apos;une analyse IA prudente et
          sourcée.
        </p>
      </header>

      <SearchForm />

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
          Explorez les jeux de données futurs avec MCP data.gouv.fr — voir{" "}
          <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">
            docs/mcp-datagouv.md
          </code>{" "}
          dans le dépôt.
        </p>
      </section>
    </main>
  );
}
