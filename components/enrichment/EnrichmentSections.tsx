import type { TerritoryProfile } from "@/lib/types";
import { DemographicsSection } from "./DemographicsSection";
import { EconomySection } from "./EconomySection";
import { EquipmentsSection } from "./EquipmentsSection";
import { FiscalSection } from "./FiscalSection";
import { GeographySection } from "./GeographySection";
import { HousingSection } from "./HousingSection";
import { MobilitySection } from "./MobilitySection";
import { PropertySection } from "./PropertySection";
import { RisksSection } from "./RisksSection";
import { SecuritySection } from "./SecuritySection";

interface EnrichmentSectionsProps {
  territory: TerritoryProfile;
}

export function EnrichmentSections({ territory }: EnrichmentSectionsProps) {
  const enrichment = territory.enrichment;

  return (
    <div className="space-y-6">
      <DemographicsSection territory={territory} />
      <EconomySection territory={territory} />
      {enrichment?.equipments ? (
        <EquipmentsSection territory={territory} />
      ) : null}
      {enrichment?.risks ? <RisksSection territory={territory} /> : null}
      {enrichment?.security ? <SecuritySection territory={territory} /> : null}
      {enrichment?.housing ? <HousingSection territory={territory} /> : null}
      {enrichment?.mobility ? <MobilitySection territory={territory} /> : null}
      {enrichment?.fiscal ? <FiscalSection territory={territory} /> : null}
      {enrichment?.geography ? (
        <GeographySection territory={territory} />
      ) : null}
      {enrichment?.property ? <PropertySection territory={territory} /> : null}
    </div>
  );
}
