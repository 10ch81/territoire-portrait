"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CommuneSearchResult } from "@/lib/types";
import { ErrorBox } from "./ErrorBox";

export function SearchForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<CommuneSearchResult["matches"]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMatches([]);

    const trimmed = query.trim();
    if (!trimmed) {
      setError("Saisissez un nom de commune, un code postal ou un code INSEE.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/commune?q=${encodeURIComponent(trimmed)}`,
      );
      const data = (await response.json()) as
        | CommuneSearchResult
        | { error: string };

      if (!response.ok || "error" in data) {
        setError(
          "error" in data
            ? data.error
            : "Erreur lors de la recherche de commune.",
        );
        return;
      }

      if (data.resolved) {
        router.push(`/commune/${data.resolved.inseeCode}`);
        return;
      }

      if (data.matches.length === 0) {
        setError("Aucune commune trouvée pour cette recherche.");
        return;
      }

      setMatches(data.matches);
    } catch {
      setError("Impossible de contacter le serveur. Réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Recherche</h2>
      <p className="mt-1 text-sm text-slate-600">
        Nom de commune, code postal (ex. 44000) ou code INSEE (ex. 44109).
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="commune-search" className="sr-only">
          Rechercher une commune
        </label>
        <input
          id="commune-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex. Nantes, 75001, 44109…"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Recherche…" : "Analyser"}
        </button>
      </form>

      {error ? <div className="mt-4"><ErrorBox message={error} /></div> : null}

      {matches.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {matches.map((match) => (
            <li key={match.inseeCode}>
              <button
                type="button"
                onClick={() => router.push(`/commune/${match.inseeCode}`)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50"
              >
                <span>
                  <span className="font-medium text-slate-900">{match.name}</span>
                  <span className="ml-2 text-sm text-slate-500">
                    INSEE {match.inseeCode}
                    {match.postalCodes[0]
                      ? ` · ${match.postalCodes[0]}`
                      : ""}
                  </span>
                </span>
                <span className="text-sm text-blue-700">Voir →</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
