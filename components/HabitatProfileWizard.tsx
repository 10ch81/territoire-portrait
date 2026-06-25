"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { buildCompareUrl } from "@/lib/compare/parse-codes";
import {
  COMPARE_EXAMPLE_CODES,
  COMPARE_EXAMPLE_LABEL,
} from "@/lib/ux/recent-communes";
import { saveComparePriorities } from "@/lib/ux/compare-user-profile";
import {
  HABITAT_PROFILE_OPTIONS,
  HABITAT_STORAGE_KEY,
  MAX_HABITAT_PRIORITIES,
  parseHabitatProfile,
  serializeHabitatProfile,
  validateHabitatPriorities,
} from "@/lib/ux/habitat-profile";

function readInitialSelection(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  return parseHabitatProfile(window.localStorage.getItem(HABITAT_STORAGE_KEY))?.priorityIds ?? [];
}

export function HabitatProfileWizard() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(readInitialSelection);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggle = useCallback(
    (profileId: string) => {
      setMessage(null);
      setSelected((current) => {
        if (current.includes(profileId)) {
          return current.filter((id) => id !== profileId);
        }
        if (current.length >= MAX_HABITAT_PRIORITIES) {
          setMessage(`Choisissez au maximum ${MAX_HABITAT_PRIORITIES} priorités.`);
          return current;
        }
        return [...current, profileId];
      });
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const priorities = validateHabitatPriorities(selected);
    if (priorities.length === 0) {
      setMessage("Sélectionnez au moins une priorité pour lancer la comparaison.");
      return;
    }

    window.localStorage.setItem(
      HABITAT_STORAGE_KEY,
      serializeHabitatProfile({ priorityIds: priorities }),
    );
    saveComparePriorities(priorities);
    router.push(buildCompareUrl([...COMPARE_EXAMPLE_CODES], { priorities }));
  }, [router, selected]);

  return (
    <section
      className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6"
      aria-labelledby="habitat-profile-heading"
    >
      <h2 id="habitat-profile-heading" className="text-base font-semibold text-slate-900">
        Votre profil « Où habiter ? »
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Choisissez jusqu&apos;à {MAX_HABITAT_PRIORITIES} thèmes qui comptent pour vous. Nous
        pré-sélectionnerons les points saillants du comparateur ({COMPARE_EXAMPLE_LABEL} en
        exemple).
      </p>

      <fieldset className="mt-4">
        <legend className="sr-only">Priorités de comparaison</legend>
        <ul className="grid gap-3 sm:grid-cols-2">
          {HABITAT_PROFILE_OPTIONS.map((option) => {
            const active = selected.includes(option.id);
            const disabled =
              !active && selected.length >= MAX_HABITAT_PRIORITIES;
            return (
              <li key={option.id}>
                <label
                  className={
                    active
                      ? "flex cursor-pointer gap-3 rounded-xl border border-blue-600 bg-white p-4 shadow-sm"
                      : disabled
                        ? "flex cursor-not-allowed gap-3 rounded-xl border border-slate-200 bg-slate-100/80 p-4 opacity-70"
                        : "flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
                  }
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    checked={active}
                    disabled={disabled}
                    onChange={() => handleToggle(option.id)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-600">{option.hint}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {message ? (
        <p role="status" className="mt-3 text-sm text-amber-900">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Comparer avec mes priorités →
        </button>
        <p className="self-center text-xs text-slate-500">
          {selected.length}/{MAX_HABITAT_PRIORITIES} sélectionnées — conservées localement.
        </p>
      </div>
    </section>
  );
}
