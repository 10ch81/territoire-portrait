import type { TerritoryProfile } from "@/lib/types";
import { isMobilityAvailable } from "@/lib/enrichment/mobility";
import { isEquipmentsSectionAvailable } from "@/lib/ux/sections";
import { DemographicsSection } from "./DemographicsSection";
import { EconomySection } from "./EconomySection";
import { EquipmentsSection } from "./EquipmentsSection";
import { FiscalSection } from "./FiscalSection";
import { HealthSection } from "./HealthSection";
import { GeographySection } from "./GeographySection";
import { HousingSection } from "./HousingSection";
import { MobilitySection } from "./MobilitySection";
import { PropertySection } from "./PropertySection";
import { RisksSection } from "./RisksSection";
import { SecuritySection } from "./SecuritySection";
import { ProximityServicesSection } from "./ProximityServicesSection";
import { TourismSection } from "./TourismSection";
import { UrbanPolicySection } from "./UrbanPolicySection";

interface EnrichmentSectionsProps {
  territory: TerritoryProfile;
}

export function EnrichmentSections({ territory }: EnrichmentSectionsProps) {
  const enrichment = territory.enrichment;

  return (
    <div className="space-y-6">
      <DemographicsSection territory={territory} />
      <EconomySection territory={territory} />
      {isEquipmentsSectionAvailable(territory) ? (
        <EquipmentsSection territory={territory} />
      ) : null}
      {enrichment?.health ? <HealthSection territory={territory} /> : null}
      {enrichment?.risks ? <RisksSection territory={territory} /> : null}
      {enrichment?.security ? <SecuritySection territory={territory} /> : null}
      {enrichment?.housing ? <HousingSection territory={territory} /> : null}
      {enrichment?.mobility && isMobilityAvailable(enrichment.mobility) ? (
        <MobilitySection territory={territory} />
      ) : null}
      {enrichment?.urbanPolicy ? (
        <UrbanPolicySection territory={territory} />
      ) : null}
      {enrichment?.fiscal || enrichment?.publicAccounts ? (
        <FiscalSection territory={territory} />
      ) : null}
      {enrichment?.proximityServices ? (
        <ProximityServicesSection territory={territory} />
      ) : null}
      {enrichment?.tourism ? <TourismSection territory={territory} /> : null}
      {enrichment?.geography ? (
        <GeographySection territory={territory} />
      ) : null}
      {enrichment?.property ? <PropertySection territory={territory} /> : null}
    </div>
  );
}
