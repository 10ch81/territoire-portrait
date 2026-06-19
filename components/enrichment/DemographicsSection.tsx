import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AgePyramidChart } from "@/components/charts/AgePyramidChart";
import { PopulationChart } from "@/components/charts/PopulationChart";
import {
  formatPercent,
  formatRate,
} from "@/lib/enrichment";
import { formatDensity } from "@/lib/enrichment";
import { formatPopulation } from "@/lib/territory";
import { getPopulationDisplayMeta } from "@/lib/ux/population";
import { RP_VINTAGE } from "@/lib/sources";
import type { TerritoryProfile } from "@/lib/types";

interface DemographicsSectionProps {
  territory: TerritoryProfile;
}

export function DemographicsSection({ territory }: DemographicsSectionProps) {
  const enrichment = territory.enrichment;
  const populationHistory = enrichment?.populationHistory;
  const derived = enrichment?.derived;
  const sociodemographics = enrichment?.sociodemographics;
  const populationMeta = getPopulationDisplayMeta(territory);

  return (
    <DataSection
      id="demographie"
      title="Démographie"
      subtitle="Identité territoriale, évolution et structure par âge"
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Territoire & INSEE
          </h3>
          <dl className="mt-3 space-y-3">
            <DataRow label="Commune" value={territory.name} />
            <DataRow label="Code INSEE" value={territory.inseeCode} />
            <DataRow
              label="Codes postaux"
              value={
                territory.postalCodes.length > 0
                  ? territory.postalCodes.join(", ")
                  : "Donnée non disponible"
              }
            />
            <DataRow
              label="Département"
              value={
                territory.department
                  ? `${territory.department.name} (${territory.department.code})`
                  : "Donnée non disponible"
              }
            />
            <DataRow
              label="Région"
              value={
                territory.region
                  ? `${territory.region.name} (${territory.region.code})`
                  : "Donnée non disponible"
              }
            />
            <DataRow
              label="EPCI"
              value={
                territory.epci
                  ? `${territory.epci.name} (${territory.epci.code})`
                  : "Donnée non disponible"
              }
            />
            <DataRow
              label="Densité"
              value={formatDensity(territory.densityPerKm2)}
            />
            <DataRow
              label={populationMeta.label}
              value={formatPopulation(territory.population)}
            />
            <p className="text-xs text-slate-500">{populationMeta.definition}</p>
            {populationMeta.consistencyNotes.map((note) => (
              <p key={note} className="text-xs text-amber-800">
                {note}
              </p>
            ))}
            {derived && derived.populationGrowthPercent != null ? (
              <DataRow
                label={`Croissance ${derived.populationGrowthFromYear ?? ""}→${derived.populationGrowthToYear ?? ""}`}
                value={formatPercent(derived.populationGrowthPercent)}
              />
            ) : null}
          </dl>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Évolution démographique
          </h3>
          {populationHistory?.available ? (
            <>
              <PopulationChart history={populationHistory.history} />
              <dl className="mt-3 space-y-3">
                {populationHistory.history.map((point) => (
                  <DataRow
                    key={point.year}
                    label={String(point.year)}
                    value={formatPopulation(point.population)}
                  />
                ))}
                <p className="text-xs text-slate-500">{populationHistory.note}</p>
              </dl>
            </>
          ) : (
            <SectionUnavailable
              message={
                populationHistory?.note ??
                "Historique population non disponible."
              }
            />
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Structure par âge — Recensement {sociodemographics?.year ?? RP_VINTAGE}
          </h3>
          {sociodemographics?.available ? (
            <>
              <AgePyramidChart ageBands={sociodemographics.ageBands} />
              <dl className="mt-3 space-y-3">
                {sociodemographics.ageBands.map((band) => (
                  <DataRow
                    key={band.label}
                    label={band.label}
                    value={
                      band.sharePercent !== null
                        ? `${formatPopulation(band.population)} (${formatPercent(band.sharePercent)})`
                        : formatPopulation(band.population)
                    }
                  />
                ))}
                <p className="text-xs text-slate-500">{sociodemographics.note}</p>
              </dl>
            </>
          ) : (
            <SectionUnavailable
              message={
                sociodemographics?.note ??
                "Données socio-démographiques non disponibles."
              }
            />
          )}
        </div>

        {enrichment?.socialBenefits?.available ? (
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Prestations sociales (CNAF {enrichment.socialBenefits.rsaVintage})
            </h3>
            <dl className="mt-3 space-y-3">
              {enrichment.socialBenefits.rsaShareAmongHouseholdsPercent !== null ? (
                <DataRow
                  label="Part des ménages allocataires du RSA"
                  value={formatRate(
                    enrichment.socialBenefits.rsaShareAmongHouseholdsPercent,
                  )}
                />
              ) : null}
              <p className="text-xs text-slate-500">
                {enrichment.socialBenefits.note}
              </p>
            </dl>
          </div>
        ) : null}
      </div>
    </DataSection>
  );
}
