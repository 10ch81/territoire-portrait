import Link from "next/link";

export default function CommuneNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Commune introuvable</h1>
      <p className="text-slate-600">
        Le code INSEE fourni ne correspond à aucune commune connue.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
      >
        Retour à la recherche
      </Link>
    </main>
  );
}
