import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import type { TerritoryProfile } from "@/lib/types";

interface MobilitySectionProps {
  territory: TerritoryProfile;
}

export function MobilitySection({ territory }: MobilitySectionProps) {
  const mobility = territory.enrichment?.mobility;
  const derived = territory.enrichment?.derived;

  return (
    <DataSection
      id="mobilite"
      title="Mobilité"
      subtitle={
        <>
          <AcronymTooltip term="IRVE" /> — recharge électrique
        </>
      }
      vintage={mobility?.year}
    >
      {mobility?.available ? (
        <dl className="space-y-3">
          <DataRow
            label="Points de charge"
            value={new Intl.NumberFormat("fr-FR").format(mobility.chargingPoints)}
          />
          <DataRow
            label="Stations recensées"
            value={new Intl.NumberFormat("fr-FR").format(mobility.stations)}
          />
          {derived?.irvePointsPer1000Residents != null ? (
            <DataRow
              label="Points de charge pour 1 000 hab."
              value={new Intl.NumberFormat("fr-FR", {
                maximumFractionDigits: 1,
              }).format(derived.irvePointsPer1000Residents)}
            />
          ) : null}
          <p className="text-xs text-slate-500">{mobility.note}</p>
        </dl>
      ) : (
        <SectionUnavailable
          message={mobility?.note ?? "Données IRVE non disponibles."}
        />
      )}
    </DataSection>
  );
}
