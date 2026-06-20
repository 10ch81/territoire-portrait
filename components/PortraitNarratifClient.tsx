"use client";

import { useEffect, useState } from "react";
import type { PortraitNarrative } from "@/lib/portrait/types";
import { ErrorBox } from "./ErrorBox";

interface PortraitNarratifClientProps {
  codeInsee: string;
}

function isPortraitNarrative(value: unknown): value is PortraitNarrative {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    "paragraphs" in value &&
    typeof (value as PortraitNarrative).title === "string" &&
    Array.isArray((value as PortraitNarrative).paragraphs)
  );
}

export function PortraitNarratifClient({ codeInsee }: PortraitNarratifClientProps) {
  const [portrait, setPortrait] = useState<PortraitNarrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPortrait(null);
    setError(null);
    setLoading(false);
  }, [codeInsee]);

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

  return (
    <section className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Portrait narratif</h2>
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
          Rédaction libre · Mistral
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
        <p className="text-sm font-medium text-violet-950">
          Rédaction libre générée par IA : ce portrait peut interpréter les données
          affichées et extrapoler au-delà des faits strictement établis.
        </p>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      ) : null}

      {hasPortrait ? (
        <article className="mt-5 space-y-4">
          {portrait.title.trim() ? (
            <h3 className="text-xl font-semibold leading-snug text-slate-900">
              {portrait.title}
            </h3>
          ) : null}
          {portrait.paragraphs.map((paragraph, index) => (
            <p
              key={`${index}-${paragraph.slice(0, 24)}`}
              className="text-sm leading-relaxed text-slate-700"
            >
              {paragraph}
            </p>
          ))}
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
