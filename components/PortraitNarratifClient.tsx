"use client";

import { useState } from "react";
import type { PortraitClosingSynthesis, PortraitNarrative } from "@/lib/portrait/types";
import { ErrorBox } from "./ErrorBox";

interface PortraitNarratifClientProps {
  codeInsee: string;
}

function isPortraitClosingSynthesis(value: unknown): value is PortraitClosingSynthesis {
  return (
    typeof value === "object" &&
    value !== null &&
    "resume" in value &&
    "watchPoints" in value &&
    "opportunities" in value &&
    typeof (value as PortraitClosingSynthesis).resume === "string" &&
    Array.isArray((value as PortraitClosingSynthesis).watchPoints) &&
    Array.isArray((value as PortraitClosingSynthesis).opportunities)
  );
}

function isPortraitNarrative(value: unknown): value is PortraitNarrative {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    "paragraphs" in value &&
    typeof (value as PortraitNarrative).title === "string" &&
    Array.isArray((value as PortraitNarrative).paragraphs) &&
    ((!("generatedBy" in value) ||
      (value as PortraitNarrative).generatedBy === "deterministic" ||
      (value as PortraitNarrative).generatedBy === "mistral_polish") &&
      (!("closingSynthesis" in value) ||
        isPortraitClosingSynthesis(
          (value as PortraitNarrative).closingSynthesis,
        )))
  );
}

function ClosingSynthesisBlock({ synthesis }: { synthesis: PortraitClosingSynthesis }) {
  return (
    <section className="mt-8 space-y-4 rounded-xl border border-violet-200 bg-violet-50/60 p-5">
      <div>
        <h4 className="text-sm font-semibold text-violet-950">Synthèse après lecture</h4>
        <p className="mt-1 text-xs text-violet-900/80">
          Reprise structurée après les rubriques sectorielles — résumé canonique, vigilance
          filtrée du portrait et opportunités documentées.
        </p>
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Résumé
        </h5>
        <p className="text-sm leading-relaxed text-slate-800">{synthesis.resume}</p>
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Points d&apos;attention
        </h5>
        {synthesis.watchPoints.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-800">
            {synthesis.watchPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">Aucun point d&apos;attention retenu.</p>
        )}
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Opportunités
        </h5>
        {synthesis.opportunities.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-800">
            {synthesis.opportunities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">Aucune opportunité documentée.</p>
        )}
      </div>
    </section>
  );
}

export function PortraitNarratifClient({ codeInsee }: PortraitNarratifClientProps) {
  const [portrait, setPortrait] = useState<PortraitNarrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    const targetCodeInsee = codeInsee;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeInsee: targetCodeInsee }),
      });

      const data: unknown = await response.json();

      if (targetCodeInsee !== codeInsee) {
        return;
      }

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Impossible de générer le portrait pour le moment.";
        setError(message);
        return;
      }

      if (!isPortraitNarrative(data)) {
        setError("Réponse inattendue du serveur.");
        return;
      }

      setPortrait(data);
    } catch {
      if (targetCodeInsee === codeInsee) {
        setError("Impossible de générer le portrait pour le moment.");
      }
    } finally {
      if (targetCodeInsee === codeInsee) {
        setLoading(false);
      }
    }
  }

  const hasPortrait =
    portrait !== null &&
    (portrait.title.trim().length > 0 || portrait.paragraphs.length > 0);

  const displaySectors =
    portrait?.sectors?.filter((sector) => sector.id !== "synthesis") ?? [];

  return (
    <section className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Portrait narratif</h2>
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
          {portrait?.generatedBy === "mistral_polish"
            ? "Reformulation · Mistral"
            : "Portrait sectoriel · serveur"}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
        {portrait?.generatedBy === "mistral_polish" ? (
          <p className="text-sm font-medium text-violet-950">
            Reformulation stylistique — chiffres contrôlés côté serveur, sans ajout de
            faits.
          </p>
        ) : (
          <p className="text-sm font-medium text-violet-950">
            Portrait structuré à partir des données publiques — chiffres vérifiés côté
            serveur.
          </p>
        )}
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      ) : null}

      {hasPortrait ? (
        <article className="mt-5 space-y-5">
          {portrait.title.trim() ? (
            <h3 className="text-xl font-semibold leading-snug text-slate-900">
              {portrait.title}
            </h3>
          ) : null}
          {displaySectors.length > 0
            ? displaySectors.map((sector) => (
                <section key={sector.id} className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-800">
                    {sector.index}. {sector.title}
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-700">{sector.paragraph}</p>
                </section>
              ))
            : portrait.paragraphs.map((paragraph, index) => (
                <p
                  key={`${index}-${paragraph.slice(0, 24)}`}
                  className="text-sm leading-relaxed text-slate-700"
                >
                  {paragraph}
                </p>
              ))}
          {portrait.closingSynthesis ? (
            <ClosingSynthesisBlock synthesis={portrait.closingSynthesis} />
          ) : null}
        </article>
      ) : null}

      <div className="mt-5">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Génération en cours…"
            : hasPortrait
              ? "Régénérer"
              : "Générer le portrait"}
        </button>
      </div>
    </section>
  );
}
