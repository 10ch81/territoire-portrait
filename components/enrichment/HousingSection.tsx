import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import { formatPercent } from "@/lib/enrichment";
import { formatPopulation } from "@/lib/territory";
import type { TerritoryProfile } from "@/lib/types";

interface HousingSectionProps {
  territory: TerritoryProfile;
}

export function HousingSection({ territory }: HousingSectionProps) {
  const housing = territory.enrichment?.housing;

  return (
    <DataSection
      id="logement"
      title="Logements sociaux"
      subtitle={
        <>
          <AcronymTooltip term="RPLS" />
        </>
      }
      vintage={housing?.year}
    >
      {housing?.available ? (
        <dl className="space-y-3">
          <DataRow
            label="Parc total"
            value={formatPopulation(housing.totalUnits)}
          />
          <DataRow
            label="Logements loués"
            value={formatPopulation(housing.occupiedUnits)}
          />
          <DataRow
            label="Logements vacants"
            value={formatPopulation(housing.vacantUnits)}
          />
          {housing.totalDwellings !== null ? (
            <DataRow
              label="Parc de logements (RP 2021)"
              value={formatPopulation(housing.totalDwellings)}
            />
          ) : null}
          {housing.socialHousingSharePercent !== null ? (
            <DataRow
              label="Part du parc global"
              value={formatPercent(housing.socialHousingSharePercent)}
            />
          ) : null}
          {housing.vacancyRatePercent !== null ? (
            <DataRow
              label="Taux de vacance (RPLS)"
              value={formatPercent(housing.vacancyRatePercent)}
            />
          ) : null}
          <p className="text-xs text-slate-500">{housing.note}</p>
        </dl>
      ) : (
        <SectionUnavailable
          message={housing?.note ?? "Données RPLS non disponibles."}
        />
      )}
    </DataSection>
  );
}
