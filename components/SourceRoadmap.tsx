import {
  groupSourceRoadmap,
  type SourceRoadmapEntry,
  type SourceRoadmapStatus,
} from "@/lib/ux/source-roadmap";

function StatusBadge({ status }: { status: SourceRoadmapStatus }) {
  const styles =
    status === "partial"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-slate-100 text-slate-600 border-slate-200";

  const label = status === "partial" ? "Partiel" : "À venir";

  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

function RoadmapItem({ entry }: { entry: SourceRoadmapEntry }) {
  return (
    <li className="rounded-lg border border-slate-100 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {entry.theme}
          </p>
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block font-medium text-blue-700 hover:underline"
          >
            {entry.name}
          </a>
        </div>
        <StatusBadge status={entry.status} />
      </div>
      <p className="mt-1.5 text-sm text-slate-600">{entry.description}</p>
    </li>
  );
}

export function SourceRoadmap() {
  const groups = groupSourceRoadmap();

  return (
    <div className="mt-6 border-t border-slate-100 pt-6">
      <h3 className="text-sm font-semibold text-slate-700">
        Couverture et prochaines sources
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Jeux de données publics intégrés progressivement. Les sources déjà
        mobilisées pour cette fiche figurent ci-dessus.
      </p>

      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <div key={group.key}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.label}
            </h4>
            <ul className="mt-2 space-y-2">
              {group.entries.map((entry) => (
                <RoadmapItem key={entry.id} entry={entry} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
