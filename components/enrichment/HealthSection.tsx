import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import type { TerritoryProfile } from "@/lib/types";

interface HealthSectionProps {
  territory: TerritoryProfile;
}

export function HealthSection({ territory }: HealthSectionProps) {
  const health = territory.enrichment?.health;

  return (
    <DataSection
      id="sante"
      title="Santé & médico-social"
      subtitle={<AcronymTooltip term="FINESS" />}
      vintage={health?.year}
    >
      {health?.available ? (
        <dl className="space-y-3">
          <DataRow
            label="Établissements recensés"
            value={new Intl.NumberFormat("fr-FR").format(
              health.totalEstablishments,
            )}
          />
          {health.byCategory.slice(0, 6).map((item) => (
            <DataRow
              key={`cat-${item.code}`}
              label={item.label}
              value={new Intl.NumberFormat("fr-FR").format(item.count)}
            />
          ))}
          {health.byType.length > 0 ? (
            <div>
              <dt className="text-sm font-medium text-slate-500">
                Principaux types d&apos;établissement
              </dt>
              <dd className="mt-2">
                <ul className="space-y-1 text-sm text-slate-700">
                  {health.byType.slice(0, 6).map((item) => (
                    <li key={`type-${item.code}`}>
                      {item.label} —{" "}
                      {new Intl.NumberFormat("fr-FR").format(item.count)}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          <p className="text-xs text-slate-500">{health.note}</p>
        </dl>
      ) : (
        <SectionUnavailable
          message={health?.note ?? "Données FINESS non disponibles."}
        />
      )}
    </DataSection>
  );
}
