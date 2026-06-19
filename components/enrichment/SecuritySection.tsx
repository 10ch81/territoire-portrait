import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import { SourceGuide } from "@/components/SourceGuide";
import { formatRatePer1000 } from "@/lib/enrichment/security-format";
import type { TerritoryProfile } from "@/lib/types";

interface SecuritySectionProps {
  territory: TerritoryProfile;
}

export function SecuritySection({ territory }: SecuritySectionProps) {
  const security = territory.enrichment?.security;

  return (
    <DataSection
      id="securite"
      title="Sécurité"
      subtitle={
        <>
          <AcronymTooltip term="SSMSI" /> — délinquance enregistrée (lieu de commission)
        </>
      }
      vintage={security?.year}
    >
      {security?.available ? (
        <div className="space-y-4">
          <SourceGuide guideId="ssmsi" vintage={security.year} />
          <p className="text-xs text-slate-500">
            {security.diffusedIndicatorCount}/{security.indicators.length} indicateurs
            diffusés pour cette commune (règles de secret statistique SSMSI).
          </p>
          <div className="space-y-4">
            {security.indicators.map((indicator) => (
              <div key={indicator.id} className="border-b border-slate-100 pb-3 last:border-0">
                <p className="text-sm font-medium text-slate-700">{indicator.label}</p>
                {indicator.diffused ? (
                  <dl className="mt-2 space-y-1">
                    <DataRow
                      label="Taux pour 1 000 hab."
                      value={formatRatePer1000(indicator.ratePer1000)}
                    />
                    {indicator.count !== null ? (
                      <DataRow
                        label="Faits enregistrés"
                        value={new Intl.NumberFormat("fr-FR").format(indicator.count)}
                      />
                    ) : null}
                    {indicator.departmentRatePer1000 !== null ? (
                      <DataRow
                        label="Taux départemental (réf.)"
                        value={formatRatePer1000(indicator.departmentRatePer1000)}
                      />
                    ) : null}
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Donnée non disponible (non diffusée par le SSMSI)
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">{security.note}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          {security?.note ?? "Donnée non disponible"}
        </p>
      )}
    </DataSection>
  );
}
