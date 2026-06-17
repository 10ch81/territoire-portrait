import type { DataSource } from "@/lib/types";
import { PLANNED_SOURCES } from "@/lib/sources";

interface SourcesListProps {
  sources: DataSource[];
  showPlanned?: boolean;
}

export function SourcesList({ sources, showPlanned = true }: SourcesListProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Sources</h2>
      <p className="mt-1 text-sm text-slate-600">
        Données utilisées pour cette fiche. Aucune donnée n&apos;est inventée.
      </p>

      <ul className="mt-4 space-y-3">
        {sources.map((source) => (
          <li
            key={source.id}
            className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 hover:underline"
            >
              {source.name}
            </a>
            <p className="mt-1 text-sm text-slate-600">{source.description}</p>
            {source.accessedAt ? (
              <p className="mt-1 text-xs text-slate-400">
                Consulté le{" "}
                {new Intl.DateTimeFormat("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(source.accessedAt))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {showPlanned ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700">
            Sources prévues (MCP data.gouv.fr)
          </h3>
          <ul className="mt-2 space-y-2">
            {PLANNED_SOURCES.map((source) => (
              <li key={source.id} className="text-sm text-slate-500">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {source.name}
                </a>
                {" — "}
                {source.description}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
