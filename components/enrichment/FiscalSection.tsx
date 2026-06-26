import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import {
  computeDebtPaybackYearsFromSnapshot,
  computeDebtServiceToRevenuePercentFromSnapshot,
  formatCurrency,
  formatPaybackYears,
  formatPercent,
  formatRate,
} from "@/lib/enrichment";
import type { TerritoryProfile } from "@/lib/types";

interface FiscalSectionProps {
  territory: TerritoryProfile;
}

export function FiscalSection({ territory }: FiscalSectionProps) {
  const fiscal = territory.enrichment?.fiscal;
  const publicAccounts = territory.enrichment?.publicAccounts;
  const hasRei = fiscal?.available === true;
  const hasOfgl = publicAccounts?.available === true;

  const debtPaybackYears = publicAccounts
    ? computeDebtPaybackYearsFromSnapshot(publicAccounts)
    : null;
  const debtServiceToRevenuePercent = publicAccounts
    ? computeDebtServiceToRevenuePercentFromSnapshot(publicAccounts)
    : null;

  return (
    <DataSection
      id="fiscalite"
      title="Finances locales"
      subtitle={
        <>
          {hasRei ? <AcronymTooltip term="REI" /> : null}
          {hasRei && hasOfgl ? " · " : null}
          {hasOfgl ? <AcronymTooltip term="OFGL" /> : null}
        </>
      }
      vintage={publicAccounts?.year ?? fiscal?.year}
    >
      {hasRei || hasOfgl ? (
        <dl className="space-y-3">
          {hasRei ? (
            <>
              <DataRow
                label="Taux taxe foncière bâti"
                value={formatRate(fiscal.propertyTaxBuiltRate)}
              />
              <DataRow
                label="Taux taxe foncière non bâti"
                value={formatRate(fiscal.propertyTaxUnbuiltRate)}
              />
              <p className="text-xs text-slate-500">{fiscal.note}</p>
            </>
          ) : null}
          {hasOfgl ? (
            <>
              <DataRow
                label="Dette / habitant"
                value={formatCurrency(publicAccounts.debtPerCapitaEur)}
              />
              <DataRow
                label="Délai de désendettement"
                value={formatPaybackYears(debtPaybackYears)}
              />
              <DataRow
                label="Annuité de dette / recettes"
                value={formatPercent(debtServiceToRevenuePercent)}
              />
              <p className="text-xs text-slate-500">{publicAccounts.note}</p>
            </>
          ) : null}
        </dl>
      ) : (
        <SectionUnavailable
          message={
            fiscal?.note ??
            publicAccounts?.note ??
            "Données fiscales et comptables non disponibles."
          }
        />
      )}
    </DataSection>
  );
}
