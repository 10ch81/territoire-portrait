import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import type { TerritoryProfile } from "@/lib/types";

interface EconomySectionProps {
  territory: TerritoryProfile;
}

function formatEnterpriseCount(value: number, isCapped: boolean): string {
  const formatted = new Intl.NumberFormat("fr-FR").format(value);
  return isCapped ? `≥ ${formatted}` : formatted;
}

export function EconomySection({ territory }: EconomySectionProps) {
  const enterprises = territory.enrichment?.enterprises;
  const employmentSectors = territory.enrichment?.employmentSectors;

  return (
    <DataSection
      id="economie"
      title="Économie"
      subtitle={
        <>
          <AcronymTooltip term="SIDE" /> (référence statistique) ·{" "}
          <AcronymTooltip term="SIRENE" /> (complément administratif)
          {employmentSectors?.available ? (
            <>
              {" "}
              · <AcronymTooltip term="FLORES" /> (emploi salarié A17)
            </>
          ) : null}
        </>
      }
      vintage={employmentSectors?.year ?? enterprises?.millesime}
    >
      {enterprises ? (
        <dl className="space-y-3">
          {enterprises.inseeLegalUnits !== null ? (
            <DataRow
              label="Unités légales actives (INSEE SIDE)"
              value={new Intl.NumberFormat("fr-FR").format(
                enterprises.inseeLegalUnits,
              )}
            />
          ) : null}
          {enterprises.inseeEstablishments !== null ? (
            <DataRow
              label="Établissements actifs (INSEE SIDE)"
              value={new Intl.NumberFormat("fr-FR").format(
                enterprises.inseeEstablishments,
              )}
            />
          ) : null}
          <DataRow
            label="Unités légales SIRENE (≥ 1 établissement actif)"
            value={
              enterprises.legalUnitsWithEstablishment !== null
                ? formatEnterpriseCount(
                    enterprises.legalUnitsWithEstablishment,
                    enterprises.legalUnitsIsCapped,
                  )
                : "Donnée non disponible"
            }
          />
          {enterprises.essCount !== null ? (
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <dt className="text-sm font-medium text-slate-500">
                <AcronymTooltip term="ESS" /> (SIRENE)
              </dt>
              <dd className="text-sm text-slate-900 sm:text-right">
                {new Intl.NumberFormat("fr-FR").format(enterprises.essCount)}
              </dd>
            </div>
          ) : null}
          {enterprises.rgeCount !== null ? (
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <dt className="text-sm font-medium text-slate-500">
                <AcronymTooltip term="RGE" /> (SIRENE)
              </dt>
              <dd className="text-sm text-slate-900 sm:text-right">
                {new Intl.NumberFormat("fr-FR").format(enterprises.rgeCount)}
              </dd>
            </div>
          ) : null}
          {enterprises.divergenceWarning ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {enterprises.divergenceWarning}
            </p>
          ) : null}
          <p className="text-xs text-slate-500">{enterprises.note}</p>
        </dl>
      ) : (
        <p className="text-sm text-slate-500">Donnée non disponible</p>
      )}

      {employmentSectors?.available ? (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <h3 className="text-base font-semibold text-slate-900">
            Emploi salarié par secteur (FLORES)
          </h3>
          <dl className="mt-3 space-y-3">
            <DataRow
              label="Établissements actifs"
              value={new Intl.NumberFormat("fr-FR").format(
                employmentSectors.totalEstablishments,
              )}
            />
            <DataRow
              label="Postes salariés (fin d'année)"
              value={new Intl.NumberFormat("fr-FR").format(
                employmentSectors.totalSalariedPosts,
              )}
            />
            {employmentSectors.sectors.slice(0, 8).map((sector) => (
              <DataRow
                key={sector.code}
                label={sector.label}
                value={`${new Intl.NumberFormat("fr-FR").format(sector.salariedPosts)} postes · ${new Intl.NumberFormat("fr-FR").format(sector.establishments)} établ.`}
              />
            ))}
            <p className="text-xs text-slate-500">{employmentSectors.note}</p>
          </dl>
        </div>
      ) : null}

      {territory.enrichment?.labourMarket?.available ? (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <h3 className="text-base font-semibold text-slate-900">
            Demande d&apos;emploi (France Travail {territory.enrichment.labourMarket.quarter})
          </h3>
          <dl className="mt-3 space-y-3">
            <DataRow
              label="Inscrits catégorie ABC (moyenne trimestrielle)"
              value={new Intl.NumberFormat("fr-FR").format(
                territory.enrichment.labourMarket.totalJobSeekers ?? 0,
              )}
            />
            {territory.enrichment.labourMarket.under25 !== null ? (
              <DataRow
                label="Dont moins de 25 ans"
                value={new Intl.NumberFormat("fr-FR").format(
                  territory.enrichment.labourMarket.under25,
                )}
              />
            ) : null}
            {territory.enrichment.labourMarket.age50AndOver !== null ? (
              <DataRow
                label="Dont 50 ans et plus"
                value={new Intl.NumberFormat("fr-FR").format(
                  territory.enrichment.labourMarket.age50AndOver,
                )}
              />
            ) : null}
            <p className="text-xs text-slate-500">
              {territory.enrichment.labourMarket.note}
            </p>
          </dl>
        </div>
      ) : null}
    </DataSection>
  );
}
