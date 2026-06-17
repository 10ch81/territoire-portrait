import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import type { TerritoryProfile } from "@/lib/types";

interface RisksSectionProps {
  territory: TerritoryProfile;
}

export function RisksSection({ territory }: RisksSectionProps) {
  const risks = territory.enrichment?.risks;

  return (
    <DataSection
      id="risques"
      title="Risques"
      subtitle="Géorisques — radon, inondations, catastrophes naturelles"
    >
      {risks?.available ? (
        <dl className="space-y-3">
          {risks.radon ? (
            <DataRow label="Radon" value={risks.radon.label} />
          ) : null}
          {risks.flood ? (
            <div>
              <dt className="text-sm font-medium text-slate-500">
                Inondation (<AcronymTooltip term="AZI" />)
              </dt>
              <dd className="mt-2">
                <ul className="space-y-1 text-sm text-slate-700">
                  {risks.flood.zones.map((zone) => (
                    <li key={zone}>{zone}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {risks.catNatEvents.length > 0 ? (
            <div>
              <dt className="text-sm font-medium text-slate-500">
                <AcronymTooltip term="CATNAT" /> récentes
              </dt>
              <dd className="mt-2">
                <ul className="space-y-1 text-sm text-slate-700">
                  {risks.catNatEvents.map((event) => (
                    <li key={`${event.label}-${event.startDate}`}>
                      {event.label}
                      {event.startDate ? ` (${event.startDate})` : ""}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          <p className="text-xs text-slate-500">{risks.note}</p>
        </dl>
      ) : (
        <p className="text-sm text-slate-500">Donnée non disponible</p>
      )}
    </DataSection>
  );
}
