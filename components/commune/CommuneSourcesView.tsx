import Link from "next/link";
import { SourcesList } from "@/components/SourcesList";
import type { CompletenessResult } from "@/lib/ux/completeness";
import type { TerritoryProfile } from "@/lib/types";

interface CommuneSourcesViewProps {
  territory: TerritoryProfile;
  completeness: CompletenessResult;
}

export function CommuneSourcesView({ territory, completeness }: CommuneSourcesViewProps) {
  const jsonLdUrl = `/api/commune/${encodeURIComponent(territory.inseeCode)}/jsonld`;
  const catalogUrl = "/api/indicators/catalog";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Traçabilité des données</h2>
        <p className="mt-2 text-sm text-slate-600">
          Niveau expert : sources consultées, complétude et réutilisation machine (JSON-LD,
          catalogue API).
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-700">Complétude</dt>
            <dd className="text-slate-600">{completeness.label}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Commune</dt>
            <dd className="text-slate-600">
              {territory.name} · INSEE {territory.inseeCode}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Réutiliser les données</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href={jsonLdUrl} className="font-medium text-blue-700 hover:underline">
              Export JSON-LD de la commune
            </Link>
            <span className="text-slate-500"> — indicateurs + sources structurés</span>
          </li>
          <li>
            <a
              href={catalogUrl}
              className="font-medium text-blue-700 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Catalogue API des indicateurs
            </a>
            <span className="text-slate-500"> — définitions et métadonnées publiques</span>
          </li>
        </ul>
      </section>

      <SourcesList sources={territory.sources} showPlanned={false} />
    </div>
  );
}
