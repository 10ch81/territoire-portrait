"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CommuneSearchResult } from "@/lib/types";
import { ErrorBox } from "./ErrorBox";
import {
  buildCommuneSearchSuggestions,
  formatCommuneSearchMeta,
  pickCommuneSearchInsee,
  type CommuneSearchSuggestion,
} from "@/lib/ux/commune-search-ui";

const DEBOUNCE_MS = 300;

export function SearchForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<CommuneSearchResult["matches"]>([]);
  const [suggestions, setSuggestions] = useState<CommuneSearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchCommunes = useCallback(
    async (trimmed: string, signal?: AbortSignal) => {
      const response = await fetch(
        `/api/commune?q=${encodeURIComponent(trimmed)}`,
        { signal },
      );
      const data = (await response.json()) as
        | CommuneSearchResult
        | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data
            ? data.error
            : "Erreur lors de la recherche de commune.",
        );
      }

      return data;
    },
    [],
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    abortRef.current?.abort();

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchCommunes(trimmed, controller.signal);
        if (controller.signal.aborted || query.trim() !== trimmed) {
          return;
        }

        setSuggestions(buildCommuneSearchSuggestions(data, 8));
      } catch (err) {
        if (controller.signal.aborted || query.trim() !== trimmed) {
          return;
        }
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      controller.abort();
    };
  }, [query, searchCommunes]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigateToCommune(inseeCode: string) {
    setShowSuggestions(false);
    setMatches([]);
    router.push(`/commune/${inseeCode}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMatches([]);
    setShowSuggestions(false);

    const trimmed = query.trim();
    if (!trimmed) {
      setError("Saisissez une commune, une adresse, un code postal ou un code INSEE.");
      return;
    }

    setLoading(true);

    try {
      const data = await searchCommunes(trimmed);

      if (data.resolved) {
        navigateToCommune(data.resolved.inseeCode);
        return;
      }

      if (data.matches.length > 1) {
        setMatches(data.matches);
        return;
      }

      const targetInsee = pickCommuneSearchInsee(data);
      if (targetInsee) {
        navigateToCommune(targetInsee);
        return;
      }

      setError("Aucune commune trouvée pour cette recherche.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de contacter le serveur. Réessayez plus tard.",
      );
    } finally {
      setLoading(false);
    }
  }

  function formatMatchMeta(
    match: CommuneSearchResult["matches"][number],
  ): string {
    return formatCommuneSearchMeta(match);
  }

  return (
    <section
      ref={containerRef}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-900">Recherche</h2>
      <p className="mt-1 text-sm text-slate-600">
        Nom de commune, adresse postale (BAN), code postal (ex. 44000) ou code INSEE
        (ex. 44109).
      </p>

      <form onSubmit={handleSubmit} className="relative mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="commune-search" className="sr-only">
          Rechercher une commune
        </label>
        <div className="relative flex-1">
          <input
            id="commune-search"
            type="text"
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (value.trim().length < 2) {
                setSuggestions([]);
              }
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Ex. Nantes, 12 rue de la Paix Rennes, 75001…"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            disabled={loading}
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-controls="commune-suggestions"
          />

          {showSuggestions && suggestions.length > 0 ? (
            <ul
              id="commune-suggestions"
              role="listbox"
              className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              {suggestions.map((suggestion) => (
                <li key={suggestion.key} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => navigateToCommune(suggestion.inseeCode)}
                    className="flex w-full flex-col px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">
                      {suggestion.kind === "address" ? "Adresse — " : ""}
                      {suggestion.title}
                    </span>
                    <span className="text-sm text-slate-500">{suggestion.subtitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Recherche…" : "Voir la fiche"}
        </button>
      </form>

      {error ? (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      ) : null}

      {matches.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {matches.map((match) => (
            <li key={match.inseeCode}>
              <button
                type="button"
                onClick={() => navigateToCommune(match.inseeCode)}
                className="flex w-full flex-col px-4 py-3 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="font-medium text-slate-900">{match.name}</span>
                  <span className="mt-0.5 block text-sm text-slate-500 sm:mt-0 sm:ml-2 sm:inline">
                    {formatMatchMeta(match)}
                  </span>
                </span>
                <span className="mt-1 text-sm text-blue-700 sm:mt-0">Voir →</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
