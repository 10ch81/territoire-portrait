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
import { COLLECTIVITY_DEFAULT_PRIORITIES } from "@/lib/ux/collectivity-profile";
import { useCollectivityProfileState } from "@/lib/ux/collectivity-profile-store";

export function CollectivityBenchmarkWizard() {
  const router = useRouter();
  const { profile, setReferenceCommune, persistProfile } = useCollectivityProfileState();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!profile.referenceCommune) {
      setMessage("Choisissez la commune à benchmarker.");
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
        throw new Error("Impossible de charger des communes comparables.");
      }

      if (!data.available || data.suggestions.length === 0) {
        setMessage(data.note ?? "Aucune commune comparable dans le département.");
        return;
      }

      const compareCodes = buildHabitatCompareCodes(
        profile.referenceCommune.inseeCode,
        data.suggestions.map((item) => item.inseeCode),
      );

      if (!hasMinimumHabitatCompareCodes(compareCodes)) {
        setMessage("Pas assez de communes pour comparer.");
        return;
      }

      const priorities = [...COLLECTIVITY_DEFAULT_PRIORITIES];
      persistProfile({ referenceCommune: profile.referenceCommune });
      saveComparePriorities(priorities);
      router.push(buildCompareUrl(compareCodes, { priorities }));
    } catch {
      setMessage("Impossible de lancer le benchmark pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }, [persistProfile, profile.referenceCommune, router]);

  return (
    <section
      id="collectivite"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-900">Benchmark collectivité</h2>
      <p className="mt-2 text-sm text-slate-600">
        Comparez votre commune à des communes similaires du département sur la fiscalité et le
        pilotage communal (REI, OFGL, rang EPCI).
      </p>
      <div className="mt-4">
        <HabitatReferencePicker
          value={profile.referenceCommune}
          onChange={setReferenceCommune}
        />
      </div>
      {message ? <p className="mt-3 text-sm text-amber-800">{message}</p> : null}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="mt-4 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
      >
        {submitting ? "Chargement…" : "Lancer le benchmark →"}
      </button>
    </section>
  );
}
