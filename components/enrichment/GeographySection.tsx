import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { EpciComparisonBar } from "@/components/charts/EpciComparisonBar";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import { formatDensity } from "@/lib/enrichment";
import { formatPopulation } from "@/lib/territory";
import type { TerritoryProfile } from "@/lib/types";
import {
  formatAavRole,
  formatComparisonProfile,
  formatTypologyFamilyLabel,
  formatUrbanUnitRole,
  hasTypologyContent,
  listActivePublicPolicies,
  typologyContextNote,
} from "@/lib/ux/typology-display";

interface GeographySectionProps {
  territory: TerritoryProfile;
}

function PolicyBadges({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        Aucun dispositif public national recensé dans les sources disponibles.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <li
          key={label}
          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-800"
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

export function GeographySection({ territory }: GeographySectionProps) {
  const geography = territory.enrichment?.geography;
  const typology = territory.enrichment?.territoryTypology;

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
        {hasTypologyContent(typology) ? (
          <>
            {typology?.summaryLabel ? (
              <DataRow label="Contexte territorial" value={typology.summaryLabel} />
            ) : null}
            <DataRow
              label="Profil de comparaison"
              value={formatComparisonProfile(typology!.comparisonProfile)}
            />
            {typology?.densityGrid?.available ? (
              <DataRow
                label="Grille de densité INSEE"
                value={typology.densityGrid.levelLabel ?? "Donnée non disponible"}
              />
            ) : null}
            {typology?.urbanUnit?.available ? (
              <>
                <DataRow
                  label="Unité urbaine"
                  value={
                    typology.urbanUnit.unitLabel
                      ? `${typology.urbanUnit.unitLabel}${typology.urbanUnit.unitCode ? ` (${typology.urbanUnit.unitCode})` : ""}`
                      : "Commune rattachée à une unité urbaine"
                  }
                />
                {formatUrbanUnitRole(typology.urbanUnit.role) ? (
                  <DataRow
                    label="Rôle dans l'unité urbaine"
                    value={formatUrbanUnitRole(typology.urbanUnit.role)!}
                  />
                ) : null}
              </>
            ) : null}
            {typology?.attractionArea?.available &&
            formatAavRole(typology.attractionArea.role) ? (
              <DataRow
                label="Rôle AAV"
                value={formatAavRole(typology.attractionArea.role)!}
              />
            ) : null}
            <div className="pt-1">
              <dt className="text-sm font-medium text-zinc-700">
                Dispositifs publics nationaux
              </dt>
              <dd className="mt-2">
                <PolicyBadges
                  labels={listActivePublicPolicies(typology?.publicPolicyTypologies)}
                />
              </dd>
            </div>
            <p className="text-xs text-zinc-500">{typologyContextNote()}</p>
          </>
        ) : (
          <SectionUnavailable message="Typologies communales non disponibles. Exécutez « npm run ingest:typology » et « npm run ingest:geography »." />
        )}

        {typology?.missingFamilies.map((family) => (
          <SectionUnavailable
            key={family}
            message={`${formatTypologyFamilyLabel(family)} — non disponible pour cette commune.`}
          />
        ))}

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
