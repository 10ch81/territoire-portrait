import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import type { TerritoryProfile } from "@/lib/types";

interface UrbanPolicySectionProps {
  territory: TerritoryProfile;
}

export function UrbanPolicySection({ territory }: UrbanPolicySectionProps) {
  const urbanPolicy = territory.enrichment?.urbanPolicy;

  return (
    <DataSection
      id="politique-ville"
      title="Politique de la ville"
      subtitle={<AcronymTooltip term="QPV" />}
      vintage={urbanPolicy?.year}
    >
      {urbanPolicy?.available ? (
        <dl className="space-y-3">
          <DataRow
            label="Quartier(s) prioritaire(s)"
            value={urbanPolicy.hasQpv ? "Oui" : "Non"}
          />
          {urbanPolicy.hasQpv ? (
            <>
              <DataRow
                label="Nombre de QPV"
                value={new Intl.NumberFormat("fr-FR").format(urbanPolicy.qpvCount)}
              />
              <div>
                <dt className="text-sm font-medium text-slate-700">Libellés</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  <ul className="list-inside list-disc space-y-1">
                    {urbanPolicy.qpvLabels.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            </>
          ) : null}
          <p className="text-xs text-slate-500">{urbanPolicy.note}</p>
        </dl>
      ) : (
        <SectionUnavailable
          message={urbanPolicy?.note ?? "Données QPV non disponibles."}
        />
      )}
    </DataSection>
  );
}
