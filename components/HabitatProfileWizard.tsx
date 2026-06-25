"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { ComparableCommunesResult } from "@/lib/compare/comparable";
import {
  buildHabitatCompareCodes,
  hasMinimumHabitatCompareCodes,
} from "@/lib/compare/habitat-compare-codes";
import { buildCompareUrl } from "@/lib/compare/parse-codes";
import { HabitatReferencePicker } from "@/components/habitat/HabitatReferencePicker";
import { saveComparePriorities } from "@/lib/ux/compare-user-profile";
import {
  HABITAT_PROFILE_OPTIONS,
  MAX_HABITAT_PRIORITIES,
  validateHabitatPriorities,
} from "@/lib/ux/habitat-profile";
import { useHabitatProfileState } from "@/lib/ux/habitat-profile-store";

export function HabitatProfileWizard() {
  const router = useRouter();
  const { profile, setReferenceCommune, setPriorityIds, persistProfile } =
    useHabitatProfileState();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleToggle = useCallback(
    (profileId: string) => {
      setMessage(null);
      const current = profile.priorityIds;
      let next: string[];
      if (current.includes(profileId)) {
        next = current.filter((id) => id !== profileId);
      } else if (current.length >= MAX_HABITAT_PRIORITIES) {
        setMessage(`Choisissez au maximum ${MAX_HABITAT_PRIORITIES} priorités.`);
        return;
      } else {
        next = [...current, profileId];
      }
      setPriorityIds(next);
    },
    [profile.priorityIds, setPriorityIds],
  );

  const handleReferenceChange = useCallback(
    (commune: Parameters<typeof setReferenceCommune>[0]) => {
      setMessage(null);
      setReferenceCommune(commune);
    },
    [setReferenceCommune],
  );

  const handleSubmit = useCallback(async () => {
    const priorities = validateHabitatPriorities(profile.priorityIds);
    if (priorities.length === 0) {
      setMessage("Sélectionnez au moins une priorité pour lancer la comparaison.");
      return;
    }

    if (!profile.referenceCommune) {
      setMessage("Choisissez d'abord une commune de départ (récente ou recherche).");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/commune/${encodeURIComponent(profile.referenceCommune.inseeCode)}/comparable`,
      );
      const data = (await response.json()) as ComparableCommunesResult | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data
            ? data.error
            : "Impossible de charger des communes comparables.",
        );
      }

      if (!data.available || data.suggestions.length === 0) {
        setMessage(
          data.note ??
            "Aucune commune comparable trouvée dans le département — essayez une autre commune de départ.",
        );
        return;
      }

      const compareCodes = buildHabitatCompareCodes(
        profile.referenceCommune.inseeCode,
        data.suggestions.map((item) => item.inseeCode),
      );

      if (!hasMinimumHabitatCompareCodes(compareCodes)) {
        setMessage("Pas assez de communes pour comparer — choisissez une autre commune de départ.");
        return;
      }

      persistProfile({ priorityIds: priorities, referenceCommune: profile.referenceCommune });
      saveComparePriorities(priorities);
      router.push(buildCompareUrl(compareCodes, { priorities }));
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Impossible de préparer la comparaison. Réessayez plus tard.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [persistProfile, profile.priorityIds, profile.referenceCommune, router]);

  return (
    <section
      className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6"
      aria-labelledby="habitat-profile-heading"
    >
      <h2 id="habitat-profile-heading" className="text-base font-semibold text-slate-900">
        Votre parcours « Où habiter ? »
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Choisissez une commune de départ et vos priorités — nous comparons avec des
        communes similaires du même département (profil typologique et population ±30 %).
      </p>

      <div className="mt-5 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">1. Commune de départ</h3>
          <div className="mt-2">
            <HabitatReferencePicker
              value={profile.referenceCommune}
              onChange={handleReferenceChange}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            2. Vos priorités (jusqu&apos;à {MAX_HABITAT_PRIORITIES})
          </h3>
          <fieldset className="mt-2">
            <legend className="sr-only">Priorités de comparaison</legend>
            <ul className="grid gap-3 sm:grid-cols-2">
              {HABITAT_PROFILE_OPTIONS.map((option) => {
                const active = profile.priorityIds.includes(option.id);
                const disabled =
                  !active && profile.priorityIds.length >= MAX_HABITAT_PRIORITIES;
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
                        <span className="mt-0.5 block text-sm text-slate-600">
                          {option.hint}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </div>
      </div>

      {message ? (
        <p role="status" className="mt-3 text-sm text-amber-900">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Préparation de la comparaison…" : "Comparer des communes similaires →"}
        </button>
        <p className="self-center text-xs text-slate-500">
          {profile.priorityIds.length}/{MAX_HABITAT_PRIORITIES} priorités — conservées
          localement.
        </p>
      </div>
    </section>
  );
}
