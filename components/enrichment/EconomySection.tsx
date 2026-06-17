import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import type { TerritoryProfile } from "@/lib/types";

interface EconomySectionProps {
  territory: TerritoryProfile;
}

export function EconomySection({ territory }: EconomySectionProps) {
  const enterprises = territory.enrichment?.enterprises;

  return (
    <DataSection
      id="economie"
      title="Économie"
      subtitle={
        <>
          Données <AcronymTooltip term="SIRENE" />
        </>
      }
      vintage={enterprises?.millesime}
    >
      {enterprises ? (
        <dl className="space-y-3">
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
          {enterprises.rgeCount !== null ? (
            <DataRow
              label="RGE (échantillon)"
              value={String(enterprises.rgeCount)}
            />
          ) : null}
          {enterprises.staffSizeBands.length > 0 ? (
            <div>
              <dt className="text-sm font-medium text-slate-500">
                Tranches d&apos;effectif (échantillon)
              </dt>
              <dd className="mt-2">
                <ul className="space-y-1 text-sm text-slate-700">
                  {enterprises.staffSizeBands.map((band) => (
                    <li key={band.code}>
                      {band.label} — {band.count}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
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
        <p className="text-sm text-slate-500">Donnée non disponible</p>
      )}
    </DataSection>
  );
}
