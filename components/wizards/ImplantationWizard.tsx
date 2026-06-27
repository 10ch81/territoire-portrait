"use client";

import Link from "next/link";
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
import type { HabitatReferenceCommune } from "@/lib/ux/habitat-profile";
import { loadRecentCommunes } from "@/lib/ux/recent-communes";

const IMPLANTATION_PRIORITIES = ["implantation", "dynamique"];

export function ImplantationWizard() {
  const router = useRouter();
  const [referenceCommune, setReferenceCommune] = useState<HabitatReferenceCommune | null>(
    () => {
      const recent = loadRecentCommunes()[0];
      return recent ? { inseeCode: recent.inseeCode, name: recent.name } : null;
    },
  );
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCompare = useCallback(async () => {
    if (!referenceCommune) {
      setMessage("Choisissez une commune de référence.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/commune/${encodeURIComponent(referenceCommune.inseeCode)}/comparable`,
      );
      const data = (await response.json()) as ComparableCommunesResult | { error: string };

      if (!response.ok || "error" in data || !data.available) {
        setMessage("Impossible de charger des communes comparables.");
        return;
      }

      const compareCodes = buildHabitatCompareCodes(
        referenceCommune.inseeCode,
        data.suggestions.map((item) => item.inseeCode),
      );

      if (!hasMinimumHabitatCompareCodes(compareCodes)) {
        setMessage("Pas assez de communes pour comparer.");
        return;
      }

      saveComparePriorities(IMPLANTATION_PRIORITIES);
      router.push(buildCompareUrl(compareCodes, { priorities: IMPLANTATION_PRIORITIES }));
    } catch {
      setMessage("Impossible de lancer la comparaison.");
    } finally {
      setSubmitting(false);
    }
  }, [referenceCommune, router]);

  return (
    <section
      id="implantation"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-900">Implantation économique</h2>
      <p className="mt-2 text-sm text-slate-600">
        Évaluez le potentiel d&apos;implantation : entreprises, emploi salarié, connectivité et
        transports.
      </p>
      <div className="mt-4">
        <HabitatReferencePicker value={referenceCommune} onChange={setReferenceCommune} />
      </div>
      {message ? <p className="mt-3 text-sm text-amber-800">{message}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleCompare()}
          disabled={submitting}
          className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting ? "Chargement…" : "Comparer des communes similaires"}
        </button>
        {referenceCommune ? (
          <Link
            href={`/commune/${referenceCommune.inseeCode}?vue=analyse#economie`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-300"
          >
            Voir la fiche détaillée →
          </Link>
        ) : null}
      </div>
    </section>
  );
}
