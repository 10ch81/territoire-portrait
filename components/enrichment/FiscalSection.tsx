import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import { formatRate } from "@/lib/enrichment";
import type { TerritoryProfile } from "@/lib/types";

interface FiscalSectionProps {
  territory: TerritoryProfile;
}

export function FiscalSection({ territory }: FiscalSectionProps) {
  const fiscal = territory.enrichment?.fiscal;

  return (
    <DataSection
      id="fiscalite"
      title="Fiscalité locale"
      subtitle={
        <>
          <AcronymTooltip term="REI" />
        </>
      }
      vintage={fiscal?.year}
    >
      {fiscal?.available ? (
        <dl className="space-y-3">
          <DataRow
            label="Taux taxe foncière bâti"
            value={formatRate(fiscal.propertyTaxBuiltRate)}
          />
          <DataRow
            label="Taux taxe foncière non bâti"
            value={formatRate(fiscal.propertyTaxUnbuiltRate)}
          />
          <p className="text-xs text-slate-500">{fiscal.note}</p>
        </dl>
      ) : (
        <SectionUnavailable
          message={fiscal?.note ?? "Données REI non disponibles."}
        />
      )}
    </DataSection>
  );
}
