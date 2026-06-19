import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import { formatPercent } from "@/lib/enrichment";
import { RP_VINTAGE, RPLS_VINTAGE } from "@/lib/sources";
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
      title="Logement"
      subtitle={
        <>
          <AcronymTooltip term="RPLS" /> {RPLS_VINTAGE} · RP {RP_VINTAGE} ·{" "}
          <AcronymTooltip term="LOVAC" />
        </>
      }
      vintage={housing?.year}
    >
      {housing?.available ? (
        <dl className="space-y-3">
          <DataRow
            label={`Parc locatif social (RPLS ${RPLS_VINTAGE})`}
            value={formatPopulation(housing.totalUnits)}
          />
          <DataRow
            label="Logements loués (RPLS)"
            value={formatPopulation(housing.occupiedUnits)}
          />
          <DataRow
            label="Logements vacants (RPLS)"
            value={formatPopulation(housing.vacantUnits)}
          />
          {housing.totalDwellings !== null ? (
            <DataRow
              label={`Parc de logements (RP ${RP_VINTAGE})`}
              value={formatPopulation(housing.totalDwellings)}
            />
          ) : null}
          {housing.socialHousingSharePercent !== null ? (
            <DataRow
              label="Part du parc global"
              value={formatPercent(housing.socialHousingSharePercent)}
            />
          ) : null}
          {housing.rpVacantDwellings !== null ? (
            <DataRow
              label={`Logements vacants (RP ${RP_VINTAGE})`}
              value={formatPopulation(housing.rpVacantDwellings)}
            />
          ) : null}
          {housing.rpVacancyRatePercent !== null ? (
            <DataRow
              label={`Taux de vacance générale (RP ${RP_VINTAGE})`}
              value={formatPercent(housing.rpVacancyRatePercent)}
            />
          ) : null}
          {housing.vacancyRatePercent !== null ? (
            <DataRow
              label="Taux de vacance (RPLS)"
              value={formatPercent(housing.vacancyRatePercent)}
            />
          ) : null}
          {housing.privateVacantDwellings !== null && housing.lovacVintage !== null ? (
            <DataRow
              label={`Logements vacants parc privé (LOVAC ${housing.lovacVintage})`}
              value={formatPopulation(housing.privateVacantDwellings)}
            />
          ) : null}
          {housing.privateVacancyRatePercent !== null && housing.lovacVintage !== null ? (
            <DataRow
              label={`Taux de vacance parc privé (LOVAC ${housing.lovacVintage})`}
              value={formatPercent(housing.privateVacancyRatePercent)}
            />
          ) : null}
          {housing.privateVacantStructural !== null && housing.lovacVintage !== null ? (
            <DataRow
              label={`Vacance structurelle ≥ 2 ans (LOVAC ${housing.lovacVintage})`}
              value={formatPopulation(housing.privateVacantStructural)}
            />
          ) : null}
          {housing.lovacNote ? (
            <p className="text-xs text-slate-500">{housing.lovacNote}</p>
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
