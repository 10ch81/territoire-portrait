"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CommuneSearchResult } from "@/lib/types";
import {
  buildCompareUrl,
  MAX_COMPARE_COMMUNES,
  MIN_COMPARE_COMMUNES,
  parseComparePrioritiesParam,
} from "@/lib/compare/parse-codes";
import { COMPARE_EXAMPLE_CODES } from "@/lib/ux/recent-communes";
import { ErrorBox } from "@/components/ErrorBox";

const DEBOUNCE_MS = 300;

interface CompareSelectorProps {
  selectedCodes: string[];
  selectedNames: Record<string, string>;
}

export function CompareSelector({
  selectedCodes,
  selectedNames,
}: CompareSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const priorities = parseComparePrioritiesParam(searchParams.get("priorites") ?? undefined);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CommuneSearchResult["matches"]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigateWithCodes = useCallback(
    (codes: string[]) => {
      router.push(buildCompareUrl(codes, { priorities }));
    },
    [priorities, router],
  );

  const addCommune = useCallback(
    (inseeCode: string) => {
      setError(null);
      if (selectedCodes.includes(inseeCode)) {
        setError("Cette commune est déjà dans la comparaison.");
        return;
      }
      if (selectedCodes.length >= MAX_COMPARE_COMMUNES) {
        setError(`Maximum ${MAX_COMPARE_COMMUNES} communes.`);
        return;
      }
      setQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
      navigateWithCodes([...selectedCodes, inseeCode]);
    },
    [navigateWithCodes, selectedCodes],
  );

  const removeCommune = useCallback(
    (inseeCode: string) => {
      navigateWithCodes(selectedCodes.filter((code) => code !== inseeCode));
    },
    [navigateWithCodes, selectedCodes],
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
        const response = await fetch(
          `/api/commune?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as CommuneSearchResult | { error: string };
        if (controller.signal.aborted || query.trim() !== trimmed) {
          return;
        }
        if (!response.ok || "error" in data) {
          setSuggestions([]);
          return;
        }
        setSuggestions(
          data.resolved ? [data.resolved] : data.matches.slice(0, 8),
        );
      } catch (err) {
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
  }, [query]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/commune?q=${encodeURIComponent(trimmed)}`);
      const data = (await response.json()) as CommuneSearchResult | { error: string };
      if (!response.ok || "error" in data) {
        setError("Commune introuvable.");
        return;
      }
      const match = data.resolved ?? data.matches[0];
      if (!match) {
        setError("Aucune commune trouvée.");
        return;
      }
      addCommune(match.inseeCode);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      ref={containerRef}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-900">
        Communes à comparer ({selectedCodes.length}/{MAX_COMPARE_COMMUNES})
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Sélectionnez entre {MIN_COMPARE_COMMUNES} et {MAX_COMPARE_COMMUNES} communes.
      </p>

      {selectedCodes.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {selectedCodes.map((code) => (
            <li key={code}>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-900">
                <Link href={`/commune/${code}`} className="font-medium hover:underline">
                  {selectedNames[code] ?? code}
                </Link>
                <span className="text-blue-600">({code})</span>
                <button
                  type="button"
                  onClick={() => removeCommune(code)}
                  className="rounded-full px-1 text-blue-700 hover:bg-blue-100"
                  aria-label={`Retirer ${selectedNames[code] ?? code}`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={handleSubmit} className="relative mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="compare-search" className="sr-only">
          Ajouter une commune
        </label>
        <div className="relative flex-1">
          <input
            id="compare-search"
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
            placeholder="Ajouter une commune…"
            disabled={loading || selectedCodes.length >= MAX_COMPARE_COMMUNES}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {suggestions.map((match) => (
                <li key={match.inseeCode}>
                  <button
                    type="button"
                    onClick={() => addCommune(match.inseeCode)}
                    className="flex w-full flex-col px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{match.name}</span>
                    <span className="text-sm text-slate-500">INSEE {match.inseeCode}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading || selectedCodes.length >= MAX_COMPARE_COMMUNES}
          className="rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Ajouter
        </button>
      </form>

      {error ? (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Exemple :</span>
        <button
          type="button"
          onClick={() => navigateWithCodes([...COMPARE_EXAMPLE_CODES])}
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
        >
          Rennes · Nantes · Angers
        </button>
      </div>
    </section>
  );
}
