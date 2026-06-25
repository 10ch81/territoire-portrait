"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CommuneSearchResult } from "@/lib/types";
import {
  buildCommuneSearchSuggestions,
  communeNameFromSearchSuggestion,
  formatCommuneSearchMeta,
  pickCommuneSearchInsee,
  type CommuneSearchSuggestion,
} from "@/lib/ux/commune-search-ui";
import type { HabitatReferenceCommune } from "@/lib/ux/habitat-profile";
import {
  EXAMPLE_COMMUNES,
  getRecentCommunesServerSnapshot,
  getRecentCommunesSnapshot,
  subscribeRecentCommunes,
} from "@/lib/ux/recent-communes";

const DEBOUNCE_MS = 300;

interface HabitatReferencePickerProps {
  value: HabitatReferenceCommune | null;
  onChange: (commune: HabitatReferenceCommune) => void;
}

export function HabitatReferencePicker({ value, onChange }: HabitatReferencePickerProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<CommuneSearchResult["matches"]>([]);
  const [suggestions, setSuggestions] = useState<CommuneSearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const recent = useSyncExternalStore(
    subscribeRecentCommunes,
    getRecentCommunesSnapshot,
    getRecentCommunesServerSnapshot,
  );

  const searchCommunes = useCallback(
    async (trimmed: string, signal?: AbortSignal) => {
      const response = await fetch(
        `/api/commune?q=${encodeURIComponent(trimmed)}`,
        { signal },
      );
      const data = (await response.json()) as CommuneSearchResult | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Erreur lors de la recherche de commune.",
        );
      }

      return data;
    },
    [],
  );

  const selectCommune = useCallback(
    (commune: HabitatReferenceCommune) => {
      onChange(commune);
      setQuery("");
      setSuggestions([]);
      setMatches([]);
      setShowSuggestions(false);
      setError(null);
    },
    [onChange],
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

  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMatches([]);
    setShowSuggestions(false);

    const trimmed = query.trim();
    if (!trimmed) {
      setError("Saisissez une commune, une adresse ou un code postal.");
      return;
    }

    setLoading(true);

    try {
      const data = await searchCommunes(trimmed);

      if (data.resolved) {
        selectCommune({
          inseeCode: data.resolved.inseeCode,
          name: data.resolved.name,
        });
        return;
      }

      if (data.matches.length > 1) {
        setMatches(data.matches);
        return;
      }

      const targetInsee = pickCommuneSearchInsee(data);
      const match = data.matches.find((item) => item.inseeCode === targetInsee);
      if (targetInsee && match) {
        selectCommune({ inseeCode: targetInsee, name: match.name });
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

  const quickPicks =
    recent.length > 0
      ? recent.map((commune) => ({
          inseeCode: commune.inseeCode,
          name: commune.name,
          label: commune.departmentCode
            ? `${commune.name} (${commune.departmentCode})`
            : commune.name,
        }))
      : EXAMPLE_COMMUNES.map((example) => ({
          inseeCode: example.inseeCode,
          name: example.name,
          label: example.label,
        }));

  return (
    <div ref={containerRef} className="space-y-3">
      {value ? (
        <p className="rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm text-slate-800">
          Commune de départ :{" "}
          <span className="font-semibold text-blue-900">
            {value.name} ({value.inseeCode})
          </span>
        </p>
      ) : (
        <p className="text-sm text-slate-600">
          Choisissez la commune que vous envisagez — nous proposerons des
          communes similaires dans le même département.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <span className="self-center text-sm text-slate-500">
          {recent.length > 0 ? "Récentes :" : "Exemples :"}
        </span>
        {quickPicks.map((commune) => {
          const active = value?.inseeCode === commune.inseeCode;
          return (
            <button
              key={commune.inseeCode}
              type="button"
              aria-pressed={active}
              onClick={() =>
                selectCommune({ inseeCode: commune.inseeCode, name: commune.name })
              }
              className={
                active
                  ? "rounded-full border border-blue-600 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-900"
                  : "rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:border-blue-300"
              }
            >
              {commune.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSearchSubmit} className="relative flex flex-col gap-2 sm:flex-row">
        <label htmlFor="habitat-commune-search" className="sr-only">
          Rechercher une commune de départ
        </label>
        <div className="relative flex-1">
          <input
            id="habitat-commune-search"
            type="text"
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              if (next.trim().length < 2) {
                setSuggestions([]);
              }
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Ou recherchez : Nantes, 35000 Rennes…"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            disabled={loading}
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-controls="habitat-commune-suggestions"
          />

          {showSuggestions && suggestions.length > 0 ? (
            <ul
              id="habitat-commune-suggestions"
              role="listbox"
              className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              {suggestions.map((suggestion) => (
                <li key={suggestion.key} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() =>
                      selectCommune({
                        inseeCode: suggestion.inseeCode,
                        name: communeNameFromSearchSuggestion(suggestion),
                      })
                    }
                    className="flex w-full flex-col px-4 py-3 text-left text-sm transition hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">
                      {suggestion.kind === "address" ? "Adresse — " : ""}
                      {suggestion.title}
                    </span>
                    <span className="text-slate-500">{suggestion.subtitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Recherche…" : "Sélectionner"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {matches.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {matches.map((match) => (
            <li key={match.inseeCode}>
              <button
                type="button"
                onClick={() =>
                  selectCommune({ inseeCode: match.inseeCode, name: match.name })
                }
                className="flex w-full flex-col px-4 py-3 text-left text-sm transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="font-medium text-slate-900">{match.name}</span>
                  <span className="mt-0.5 block text-slate-500 sm:mt-0 sm:ml-2 sm:inline">
                    {formatCommuneSearchMeta(match)}
                  </span>
                </span>
                <span className="mt-1 text-blue-700 sm:mt-0">Choisir →</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
