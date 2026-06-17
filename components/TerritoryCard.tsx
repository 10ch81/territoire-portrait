import type { TerritoryProfile } from "@/lib/types";
import {
  formatCoordinates,
  formatPopulation,
  formatSurface,
} from "@/lib/territory";

interface TerritoryCardProps {
  territory: TerritoryProfile;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 sm:text-right">{value}</dd>
    </div>
  );
}

export function TerritoryCard({ territory }: TerritoryCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Identité du territoire
      </h2>

      <dl className="mt-4 space-y-3">
        <DataRow label="Commune" value={territory.name} />
        <DataRow label="Code INSEE" value={territory.inseeCode} />
        <DataRow
          label="Codes postaux"
          value={
            territory.postalCodes.length > 0
              ? territory.postalCodes.join(", ")
              : "Donnée non disponible"
          }
        />
        <DataRow
          label="Département"
          value={
            territory.department
              ? `${territory.department.name} (${territory.department.code})`
              : "Donnée non disponible"
          }
        />
        <DataRow
          label="Région"
          value={
            territory.region
              ? `${territory.region.name} (${territory.region.code})`
              : "Donnée non disponible"
          }
        />
      </dl>

      <h3 className="mt-6 text-base font-semibold text-slate-900">
        Chiffres clés
      </h3>

      <dl className="mt-3 space-y-3">
        <DataRow
          label="Population"
          value={formatPopulation(territory.population)}
        />
        <DataRow
          label="Coordonnées"
          value={formatCoordinates(territory.coordinates)}
        />
        <DataRow label="Surface" value={formatSurface(territory.surfaceKm2)} />
      </dl>
    </section>
  );
}
