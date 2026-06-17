import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { EpciComparisonBar } from "@/components/charts/EpciComparisonBar";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import { formatDensity } from "@/lib/enrichment";
import { formatPopulation } from "@/lib/territory";
import type { TerritoryProfile } from "@/lib/types";

interface GeographySectionProps {
  territory: TerritoryProfile;
}

export function GeographySection({ territory }: GeographySectionProps) {
  const geography = territory.enrichment?.geography;

  return (
    <DataSection
      id="geographie"
      title="Géographie"
      subtitle={
        <>
          <AcronymTooltip term="AAV" /> & <AcronymTooltip term="EPCI" />
        </>
      }
    >
      <dl className="space-y-3">
        {geography?.attractionArea?.available ? (
          <>
            <DataRow
              label="Aire d'attraction"
              value={
                geography.attractionArea.label
                  ? `${geography.attractionArea.label} (${geography.attractionArea.code})`
                  : geography.attractionArea.code
              }
            />
            <DataRow
              label="Typologie AAV"
              value={geography.attractionArea.categoryLabel}
            />
          </>
        ) : (
          <SectionUnavailable
            message={
              geography?.attractionArea?.note ?? "Données AAV non disponibles."
            }
          />
        )}

        {geography?.epciComparison?.available ? (
          <>
            <EpciComparisonBar
              comparison={geography.epciComparison}
              communePopulation={territory.population}
              communeDensity={territory.densityPerKm2}
            />
            <DataRow
              label="Rang population (EPCI)"
              value={
                geography.epciComparison.communeRankByPopulation !== null
                  ? `${geography.epciComparison.communeRankByPopulation} / ${geography.epciComparison.communeCount}`
                  : "Donnée non disponible"
              }
            />
            <DataRow
              label="Rang densité (EPCI)"
              value={
                geography.epciComparison.communeRankByDensity !== null
                  ? `${geography.epciComparison.communeRankByDensity} / ${geography.epciComparison.communeCount}`
                  : "Donnée non disponible"
              }
            />
            <DataRow
              label="Population moyenne EPCI"
              value={formatPopulation(
                geography.epciComparison.epciAveragePopulation,
              )}
            />
            <DataRow
              label="Densité moyenne EPCI"
              value={formatDensity(geography.epciComparison.epciAverageDensity)}
            />
          </>
        ) : null}
      </dl>
    </DataSection>
  );
}
