import { DataRow } from "@/components/DataRow";
import { DataSection } from "@/components/DataSection";
import { SectionUnavailable } from "@/components/SectionUnavailable";
import { AcronymTooltip } from "@/components/AcronymTooltip";
import { formatPercent } from "@/lib/enrichment";
import type { TerritoryProfile } from "@/lib/types";

interface EquipmentsSectionProps {
  territory: TerritoryProfile;
}

export function EquipmentsSection({ territory }: EquipmentsSectionProps) {
  const equipments = territory.enrichment?.equipments;
  const education = territory.enrichment?.education;
  const connectivity = territory.enrichment?.mobility?.connectivity;
  const derived = territory.enrichment?.derived;
  const hasConnectivity = connectivity?.available === true;

  return (
    <DataSection
      id="equipements"
      title="Équipements & transports"
      subtitle={
        <>
          <AcronymTooltip term="BPE" /> — équipements et dessertes
          {hasConnectivity ? (
            <>
              {" "}
              · <AcronymTooltip term="ARCEP" /> (fibre)
            </>
          ) : null}
        </>
      }
      vintage={equipments?.year ?? connectivity?.vintage}
    >
      <div className="space-y-6">
        {equipments ? (
          <>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Équipements
              </h3>
              {equipments.available ? (
                <dl className="mt-3 space-y-3">
                  <DataRow
                    label="Nombre d'équipements recensés"
                    value={new Intl.NumberFormat("fr-FR").format(
                      equipments.totalEquipments,
                    )}
                  />
                  {derived?.equipmentsPer1000Residents != null ? (
                    <DataRow
                      label="Équipements pour 1 000 hab."
                      value={new Intl.NumberFormat("fr-FR", {
                        maximumFractionDigits: 1,
                      }).format(derived.equipmentsPer1000Residents)}
                    />
                  ) : null}
                  {equipments.byDomain.length > 0 ? (
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        {equipments.domainBreakdownLabel}
                      </dt>
                      <dd className="mt-2">
                        <ul className="space-y-1 text-sm text-slate-700">
                          {equipments.byDomain.map((domain) => (
                            <li key={domain.code}>
                              {domain.label} —{" "}
                              {new Intl.NumberFormat("fr-FR").format(domain.count)}{" "}
                              <span className="text-slate-500">types</span>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ) : null}
                  {equipments.byType.length > 0 ? (
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        {equipments.topTypesLabel}
                      </dt>
                      <dd className="mt-2">
                        <ul className="space-y-1 text-sm text-slate-700">
                          {equipments.byType.map((type) => (
                            <li key={type.code}>
                              {type.label}
                              {type.label !== type.code ? ` (${type.code})` : ""} —{" "}
                              {new Intl.NumberFormat("fr-FR").format(type.count)}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-500">{equipments.note}</p>
                </dl>
              ) : (
                <SectionUnavailable
                  message={
                    equipments.note ??
                    "Données BPE non disponibles. Exécutez « npm run ingest:bpe »."
                  }
                />
              )}
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900">Transports</h3>
              {equipments.transport.available ? (
                <dl className="mt-3 space-y-3">
                  <DataRow
                    label="Occurrences recensées (domaine transport)"
                    value={new Intl.NumberFormat("fr-FR").format(
                      equipments.transport.totalEquipments,
                    )}
                  />
                  {equipments.transport.byType.length > 0 ? (
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Types de dessertes
                      </dt>
                      <dd className="mt-2">
                        <ul className="space-y-1 text-sm text-slate-700">
                          {equipments.transport.byType.map((type) => (
                            <li key={type.code}>
                              {type.label}
                              {type.label !== type.code ? ` (${type.code})` : ""} —{" "}
                              {new Intl.NumberFormat("fr-FR").format(type.count)}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-500">{equipments.transport.note}</p>
                </dl>
              ) : (
                <SectionUnavailable
                  message={
                    equipments.transport.note ??
                    "Données de transport non disponibles."
                  }
                />
              )}
            </div>
          </>
        ) : null}

        {hasConnectivity || equipments ? (
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Équipements numériques
            </h3>
            {hasConnectivity && connectivity ? (
              <dl className="mt-3 space-y-3">
                <DataRow
                  label="Part de locaux raccordables fibre"
                  value={formatPercent(connectivity.fiberEligibleSharePercent)}
                />
                {connectivity.technologies.length > 0 ? (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">
                      Technologies disponibles
                    </dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {connectivity.technologies.join(" · ")}
                    </dd>
                  </div>
                ) : null}
                <p className="text-xs text-slate-500">{connectivity.note}</p>
              </dl>
            ) : (
              <SectionUnavailable
                message={
                  connectivity?.note ??
                  "Données ARCEP non disponibles. Exécutez « npm run ingest:fibre »."
                }
              />
            )}
          </div>
        ) : null}

        {education && (education.available || education.averageIps !== null) ? (
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Scolarisation (Annuaire Éducation)
            </h3>
            <dl className="mt-3 space-y-3">
              {education.totalOpen > 0 ? (
                <DataRow
                  label="Établissements ouverts"
                  value={new Intl.NumberFormat("fr-FR").format(education.totalOpen)}
                />
              ) : null}
              {education.bySector.length > 0 ? (
                <div>
                  <dt className="text-sm font-medium text-slate-500">Secteur</dt>
                  <dd className="mt-2">
                    <ul className="space-y-1 text-sm text-slate-700">
                      {education.bySector.map((item) => (
                        <li key={item.code}>
                          {item.label} —{" "}
                          {new Intl.NumberFormat("fr-FR").format(item.count)}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              {education.byLevel.slice(0, 6).map((item) => (
                <DataRow
                  key={item.code}
                  label={item.label}
                  value={new Intl.NumberFormat("fr-FR").format(item.count)}
                />
              ))}
              {education.averageIps !== null && education.ipsSchoolYear ? (
                <>
                  <DataRow
                    label={`IPS moyen des écoles (DEPP ${education.ipsSchoolYear})`}
                    value={education.averageIps.toLocaleString("fr-FR")}
                  />
                  {education.schoolsWithIps !== null ? (
                    <DataRow
                      label="Écoles avec IPS"
                      value={new Intl.NumberFormat("fr-FR").format(
                        education.schoolsWithIps,
                      )}
                    />
                  ) : null}
                  {education.ipsMin !== null && education.ipsMax !== null ? (
                    <DataRow
                      label="Plage IPS (min – max)"
                      value={`${education.ipsMin.toLocaleString("fr-FR")} – ${education.ipsMax.toLocaleString("fr-FR")}`}
                    />
                  ) : null}
                </>
              ) : null}
              {education.ipsNote ? (
                <p className="text-xs text-slate-500">{education.ipsNote}</p>
              ) : null}
              <p className="text-xs text-slate-500">{education.note}</p>
            </dl>
          </div>
        ) : null}
      </div>
    </DataSection>
  );
}
