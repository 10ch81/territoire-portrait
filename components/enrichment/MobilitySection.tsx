import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import { formatPercent } from "@/lib/enrichment";
import type { TerritoryProfile } from "@/lib/types";

interface MobilitySectionProps {
  territory: TerritoryProfile;
}

export function MobilitySection({ territory }: MobilitySectionProps) {
  const mobility = territory.enrichment?.mobility;
  const derived = territory.enrichment?.derived;
  const hasContent =
    mobility?.irve.available ||
    mobility?.commute.available ||
    mobility?.publicTransport.available;

  return (
    <DataSection
      id="mobilite"
      title="Mobilité"
      subtitle={
        <>
          <AcronymTooltip term="IRVE" /> · <AcronymTooltip term="GTFS" /> · RP
          2021
        </>
      }
      vintage={mobility?.commute.year ?? mobility?.irve.year}
    >
      {hasContent ? (
        <dl className="space-y-3">
          {mobility?.commute.available ? (
            <>
              <DataRow
                label="Actifs occupés (domicile-travail)"
                value={new Intl.NumberFormat("fr-FR").format(
                  mobility.commute.employedCount ?? 0,
                )}
              />
              <DataRow
                label="Part voiture / camionnette"
                value={formatPercent(mobility.commute.carSharePercent)}
              />
              <DataRow
                label="Part transports en commun"
                value={formatPercent(mobility.commute.publicTransportSharePercent)}
              />
            </>
          ) : null}
          {mobility?.publicTransport.available &&
          mobility.publicTransport.stopCount > 0 ? (
            <>
              <DataRow
                label="Arrêts GTFS recensés"
                value={new Intl.NumberFormat("fr-FR").format(
                  mobility.publicTransport.stopCount,
                )}
              />
              <DataRow
                label="Flux GTFS couvrant la commune"
                value={new Intl.NumberFormat("fr-FR").format(
                  mobility.publicTransport.feedCount,
                )}
              />
            </>
          ) : null}
          {mobility?.irve.available ? (
            <>
              <DataRow
                label="Points de charge"
                value={new Intl.NumberFormat("fr-FR").format(mobility.irve.chargingPoints)}
              />
              <DataRow
                label="Stations recensées"
                value={new Intl.NumberFormat("fr-FR").format(mobility.irve.stations)}
              />
              {derived?.irvePointsPer1000Residents != null ? (
                <DataRow
                  label="Points de charge pour 1 000 hab."
                  value={new Intl.NumberFormat("fr-FR", {
                    maximumFractionDigits: 1,
                  }).format(derived.irvePointsPer1000Residents)}
                />
              ) : null}
            </>
          ) : null}
          <p className="text-xs text-slate-500">
            {[
              mobility?.commute.note,
              mobility?.publicTransport.note,
              mobility?.irve.note,
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        </dl>
      ) : (
        <SectionUnavailable
          message={
            mobility?.irve.note ??
            mobility?.commute.note ??
            "Données de mobilité non disponibles."
          }
        />
      )}
    </DataSection>
  );
}
