import type { TerritoryProfile } from "@/lib/types";
import { EnrichmentSections } from "./enrichment/EnrichmentSections";

interface EnrichmentCardProps {
  territory: TerritoryProfile;
}

/** @deprecated Utiliser EnrichmentSections directement */
export function EnrichmentCard({ territory }: EnrichmentCardProps) {
  return <EnrichmentSections territory={territory} />;
}
