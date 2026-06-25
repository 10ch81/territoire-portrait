"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { COMPARE_PRIORITY_IDS } from "@/lib/compare/user-priorities";
import { COMPARE_THEMATIC_PROFILES } from "@/lib/compare/profiles";
import {
  buildCompareUrl,
  parseCompareCodesParam,
  parseComparePrioritiesParam,
} from "@/lib/compare/parse-codes";
import { useComparePriorities } from "@/lib/ux/compare-user-profile";

export function CompareProfileSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPriorities = parseComparePrioritiesParam(searchParams.get("priorites") ?? undefined);
  const selectedCodes = parseCompareCodesParam(searchParams.get("codes") ?? undefined);
  const { priorityIds, setPriorityIds } = useComparePriorities({ urlPriorities });

  const handleToggle = useCallback(
    (profileId: string) => {
      const next = priorityIds.includes(profileId)
        ? priorityIds.filter((id) => id !== profileId)
        : [...priorityIds, profileId];
      const normalized = next.length > 0 ? next : [...COMPARE_PRIORITY_IDS];
      setPriorityIds(normalized);

      if (selectedCodes.length > 0) {
        router.replace(buildCompareUrl(selectedCodes, { priorities: normalized }), {
          scroll: false,
        });
      }
    },
    [priorityIds, router, selectedCodes, setPriorityIds],
  );

  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 print:hidden">
      <legend className="px-1 text-sm font-semibold text-slate-900">
        Vos priorités de comparaison
      </legend>
      <p className="mt-1 text-sm text-slate-600">
        Filtrez les points saillants et mettez en avant les thèmes qui comptent pour
        vous. Le lien partageable conserve ce choix via le paramètre{" "}
        <code className="text-xs">priorites</code>.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {COMPARE_THEMATIC_PROFILES.map((profile) => {
          const active = priorityIds.includes(profile.id);
          return (
            <li key={profile.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => handleToggle(profile.id)}
                className={
                  active
                    ? "rounded-full border border-blue-600 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                }
              >
                {profile.label}
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
