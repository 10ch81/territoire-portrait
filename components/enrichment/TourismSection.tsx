import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import type { TerritoryProfile } from "@/lib/types";

interface TourismSectionProps {
  territory: TerritoryProfile;
}

export function TourismSection({ territory }: TourismSectionProps) {
  const tourism = territory.enrichment?.tourism;

  return (
    <DataSection
      id="tourisme"
      title="Tourisme"
      subtitle="Capacités d'hébergement (INSEE)"
      vintage={tourism?.year}
    >
      {tourism?.available ? (
        <dl className="space-y-3">
          <DataRow
            label="Places d'hébergement touristique"
            value={new Intl.NumberFormat("fr-FR").format(
              tourism.accommodationPlaces,
            )}
          />
          <p className="text-xs text-slate-500">{tourism.note}</p>
        </dl>
      ) : (
        <SectionUnavailable
          message={tourism?.note ?? "Données tourisme non disponibles."}
        />
      )}
    </DataSection>
  );
}
