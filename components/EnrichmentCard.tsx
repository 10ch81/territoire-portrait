import type { TerritoryProfile } from "@/lib/types";
import { formatDensity } from "@/lib/enrichment";
import {
  formatPopulation,
  formatSurface,
} from "@/lib/territory";

interface EnrichmentCardProps {
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

export function EnrichmentCard({ territory }: EnrichmentCardProps) {
  const enrichment = territory.enrichment;
  const enterprises = enrichment?.enterprises;
  const equipments = enrichment?.equipments;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Données enrichies
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        INSEE, SIRENE et BPE — sources publiques complémentaires.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Territoire & INSEE
          </h3>
          <dl className="mt-3 space-y-3">
            <DataRow
              label="EPCI"
              value={
                territory.epci
                  ? `${territory.epci.name} (${territory.epci.code})`
                  : "Donnée non disponible"
              }
            />
            <DataRow
              label="Densité"
              value={formatDensity(territory.densityPerKm2)}
            />
            <DataRow
              label="Population (légale)"
              value={formatPopulation(territory.population)}
            />
            <DataRow label="Surface" value={formatSurface(territory.surfaceKm2)} />
          </dl>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Économie — SIRENE
          </h3>
          {enterprises ? (
            <dl className="mt-3 space-y-3">
              <DataRow
                label="Entreprises (≥ 1 établissement actif)"
                value={
                  enterprises.legalUnitsWithEstablishment !== null
                    ? new Intl.NumberFormat("fr-FR").format(
                        enterprises.legalUnitsWithEstablishment,
                      )
                    : "Donnée non disponible"
                }
              />
              {enterprises.essCount !== null ? (
                <DataRow
                  label="ESS (échantillon)"
                  value={String(enterprises.essCount)}
                />
              ) : null}
              {enterprises.topActivitySections.length > 0 ? (
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Secteurs dominants (échantillon)
                  </dt>
                  <dd className="mt-2">
                    <ul className="space-y-1 text-sm text-slate-700">
                      {enterprises.topActivitySections.map((section) => (
                        <li key={section.code}>
                          {section.label} ({section.code}) — {section.count}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              <p className="text-xs text-slate-500">{enterprises.note}</p>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Donnée non disponible
            </p>
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Équipements — BPE 2024
          </h3>
          {equipments?.available ? (
            <dl className="mt-3 space-y-3">
              <DataRow
                label="Total équipements"
                value={new Intl.NumberFormat("fr-FR").format(
                  equipments.totalEquipments,
                )}
              />
              {equipments.byDomain.length > 0 ? (
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Par domaine
                  </dt>
                  <dd className="mt-2">
                    <ul className="space-y-1 text-sm text-slate-700">
                      {equipments.byDomain.map((domain) => (
                        <li key={domain.code}>
                          {domain.label} —{" "}
                          {new Intl.NumberFormat("fr-FR").format(domain.count)}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              <p className="text-xs text-slate-500">{equipments.note}</p>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-amber-800">
              {equipments?.note ??
                "Données BPE non disponibles. Exécutez « npm run ingest:bpe »."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
