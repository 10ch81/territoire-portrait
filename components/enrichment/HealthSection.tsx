import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import { formatAplConsultations } from "@/lib/apl";
import type { TerritoryProfile } from "@/lib/types";

interface HealthSectionProps {
  territory: TerritoryProfile;
}

export function HealthSection({ territory }: HealthSectionProps) {
  const health = territory.enrichment?.health;
  const healthcareAccess = territory.enrichment?.healthcareAccess;
  const gp = healthcareAccess?.generalPractitioner;
  const hasFiness = health?.available === true;
  const hasApl = healthcareAccess?.available === true && gp?.available === true;
  const vintage = hasApl ? gp?.year : health?.year;

  return (
    <DataSection
      id="sante"
      title="Santé & médico-social"
      subtitle={
        <>
          {hasFiness ? <AcronymTooltip term="FINESS" /> : null}
          {hasFiness && hasApl ? " · " : null}
          {hasApl ? <AcronymTooltip term="APL" /> : null}
        </>
      }
      vintage={vintage}
    >
      {hasFiness || hasApl ? (
        <div className="space-y-6">
          {hasApl && gp ? (
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Accessibilité aux soins de ville
              </h3>
              <dl className="mt-3 space-y-3">
                <DataRow
                  label="APL — médecins généralistes"
                  value={formatAplConsultations(gp.value)}
                />
                {gp.valueUnder65 !== null ? (
                  <DataRow
                    label="APL — MG de 65 ans et moins"
                    value={formatAplConsultations(gp.valueUnder65)}
                  />
                ) : null}
                {gp.departmentMedian !== null ? (
                  <DataRow
                    label="Médiane départementale (réf.)"
                    value={formatAplConsultations(gp.departmentMedian)}
                  />
                ) : null}
              </dl>
              <p className="mt-3 text-xs text-slate-500">{gp.note}</p>
            </div>
          ) : null}

          {hasFiness && health ? (
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Établissements sanitaires et sociaux
              </h3>
              <dl className="mt-3 space-y-3">
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
              </dl>
              <p className="mt-3 text-xs text-slate-500">{health.note}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <SectionUnavailable
          message={
            healthcareAccess?.generalPractitioner.note ??
            health?.note ??
            "Données santé non disponibles."
          }
        />
      )}
    </DataSection>
  );
}
