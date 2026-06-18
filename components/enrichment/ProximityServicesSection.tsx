import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import type { TerritoryProfile } from "@/lib/types";

interface ProximityServicesSectionProps {
  territory: TerritoryProfile;
}

export function ProximityServicesSection({
  territory,
}: ProximityServicesSectionProps) {
  const services = territory.enrichment?.proximityServices;

  return (
    <DataSection
      id="services-proximite"
      title="Services de proximité"
      subtitle="France Services"
      vintage={services?.year}
    >
      {services?.available ? (
        <dl className="space-y-3">
          <DataRow
            label="Structures France Services"
            value={new Intl.NumberFormat("fr-FR").format(
              services.franceServicesCount,
            )}
          />
          {services.structureLabels.length > 0 ? (
            <div>
              <dt className="text-sm font-medium text-slate-500">
                Structures recensées
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                <ul className="list-inside list-disc space-y-0.5">
                  {services.structureLabels.slice(0, 5).map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                  {services.structureLabels.length > 5 ? (
                    <li className="text-slate-500">
                      + {services.structureLabels.length - 5} autre(s)
                    </li>
                  ) : null}
                </ul>
              </dd>
            </div>
          ) : null}
          <p className="text-xs text-slate-500">{services.note}</p>
        </dl>
      ) : (
        <SectionUnavailable
          message={services?.note ?? "Données France Services non disponibles."}
        />
      )}
    </DataSection>
  );
}
