import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { PropertyPriceChart } from "@/components/charts/PropertyPriceChart";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import { formatCurrency, formatPropertyPrice } from "@/lib/enrichment";
import type { TerritoryProfile } from "@/lib/types";

interface PropertySectionProps {
  territory: TerritoryProfile;
}

export function PropertySection({ territory }: PropertySectionProps) {
  const property = territory.enrichment?.property;

  return (
    <DataSection
      id="immobilier"
      title="Immobilier"
      subtitle={
        <>
          <AcronymTooltip term="DVF" /> — transactions
        </>
      }
      vintage={property?.year}
    >
      {property?.available ? (
        <>
          <p className="mb-3 text-xs text-slate-500">
            Prix agrégés sur les mutations enregistrées (moyennes communales). Pas de
            distinction neuf/ancien, standing, biens atypiques, lots multiples,
            dépendances ni terrains nus.
          </p>
          <PropertyPriceChart history={property.priceHistory} />
          <dl className="mt-3 space-y-3">
            <DataRow
              label="Prix moyen au m²"
              value={formatPropertyPrice(
                property.averagePricePerM2,
                property.mutationCount,
              )}
            />
            <DataRow
              label="Prix moyen des mutations"
              value={formatPropertyPrice(
                property.averageTransactionPrice,
                property.mutationCount,
              )}
            />
            <DataRow
              label="Nombre de mutations"
              value={
                property.mutationCount !== null
                  ? new Intl.NumberFormat("fr-FR").format(property.mutationCount)
                  : "Donnée non disponible"
              }
            />
            {property.houseMutations !== null ? (
              <DataRow
                label="Mutations maisons"
                value={new Intl.NumberFormat("fr-FR").format(
                  property.houseMutations,
                )}
              />
            ) : null}
            {property.apartmentMutations !== null ? (
              <DataRow
                label="Mutations appartements"
                value={new Intl.NumberFormat("fr-FR").format(
                  property.apartmentMutations,
                )}
              />
            ) : null}
            {property.departmentAveragePricePerM2 !== null ? (
              <DataRow
                label={`Prix m² moyen département (${property.departmentCode ?? "—"})`}
                value={formatCurrency(property.departmentAveragePricePerM2)}
              />
            ) : null}
            <p className="text-xs text-slate-500">{property.note}</p>
          </dl>
        </>
      ) : (
        <SectionUnavailable
          message={property?.note ?? "Données DVF non disponibles."}
        />
      )}
    </DataSection>
  );
}
