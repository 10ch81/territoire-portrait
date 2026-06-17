import type { TerritoryProfile } from "@/lib/types";
import {
  formatCurrency,
  formatDensity,
  formatPercent,
  formatPropertyPrice,
  formatRate,
} from "@/lib/enrichment";
import {
  formatPopulation,
  formatSurface,
} from "@/lib/territory";

interface EnrichmentCardProps {
  territory: TerritoryProfile;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 sm:text-right">{value}</dd>
    </div>
  );
}

function SectionUnavailable({ message }: { message: string }) {
  return <p className="mt-2 text-sm text-amber-800">{message}</p>;
}

export function EnrichmentCard({ territory }: EnrichmentCardProps) {
  const enrichment = territory.enrichment;
  const populationHistory = enrichment?.populationHistory;
  const enterprises = enrichment?.enterprises;
  const equipments = enrichment?.equipments;
  const risks = enrichment?.risks;
  const housing = enrichment?.housing;
  const mobility = enrichment?.mobility;
  const fiscal = enrichment?.fiscal;
  const geography = enrichment?.geography;
  const property = enrichment?.property;
  const derived = enrichment?.derived;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Données enrichies
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        INSEE, SIRENE, BPE, Géorisques, RPLS, IRVE, REI, AAV et DVF — sources
        publiques complémentaires.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Territoire & INSEE
          </h3>
          <dl className="mt-3 space-y-3">
            <DataRow
              label="EPCI"
              value={
                territory.epci
                  ? `${territory.epci.name} (${territory.epci.code})`
                  : "Donnée non disponible"
              }
            />
            <DataRow
              label="Densité"
              value={formatDensity(territory.densityPerKm2)}
            />
            <DataRow
              label="Population (légale)"
              value={formatPopulation(territory.population)}
            />
            <DataRow label="Surface" value={formatSurface(territory.surfaceKm2)} />
            {derived && derived.populationGrowthPercent != null ? (
              <DataRow
                label={`Croissance ${derived.populationGrowthFromYear ?? ""}→${derived.populationGrowthToYear ?? ""}`}
                value={formatPercent(derived.populationGrowthPercent)}
              />
            ) : null}
          </dl>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Évolution démographique
          </h3>
          {populationHistory?.available ? (
            <dl className="mt-3 space-y-3">
              {populationHistory.history.map((point) => (
                <DataRow
                  key={point.year}
                  label={String(point.year)}
                  value={formatPopulation(point.population)}
                />
              ))}
              <p className="text-xs text-slate-500">{populationHistory.note}</p>
            </dl>
          ) : (
            <SectionUnavailable
              message={
                populationHistory?.note ??
                "Historique population non disponible."
              }
            />
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Structure par âge — Recensement 2021
          </h3>
          {territory.enrichment?.sociodemographics?.available ? (
            <dl className="mt-3 space-y-3">
              {territory.enrichment.sociodemographics.ageBands.map((band) => (
                <DataRow
                  key={band.label}
                  label={band.label}
                  value={
                    band.sharePercent !== null
                      ? `${formatPopulation(band.population)} (${formatPercent(band.sharePercent)})`
                      : formatPopulation(band.population)
                  }
                />
              ))}
              {territory.enrichment.sociodemographics.unemploymentRate !== null ? (
                <DataRow
                  label="Taux de chômage (15-64 ans)"
                  value={formatRate(territory.enrichment.sociodemographics.unemploymentRate)}
                />
              ) : null}
              {territory.enrichment.sociodemographics.medianDisposableIncome !==
              null ? (
                <DataRow
                  label="Revenu médian disponible (FILOSOFI)"
                  value={formatCurrency(
                    territory.enrichment.sociodemographics.medianDisposableIncome,
                  )}
                />
              ) : null}
              <p className="text-xs text-slate-500">
                {territory.enrichment.sociodemographics.note}
              </p>
            </dl>
          ) : (
            <SectionUnavailable
              message={
                territory.enrichment?.sociodemographics?.note ??
                "Données socio-démographiques non disponibles."
              }
            />
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Économie — SIRENE
          </h3>
          {enterprises ? (
            <dl className="mt-3 space-y-3">
              <DataRow
                label="Entreprises (≥ 1 établissement actif)"
                value={
                  enterprises.legalUnitsWithEstablishment !== null
                    ? new Intl.NumberFormat("fr-FR").format(
                        enterprises.legalUnitsWithEstablishment,
                      )
                    : "Donnée non disponible"
                }
              />
              {enterprises.essCount !== null ? (
                <DataRow
                  label="ESS (échantillon)"
                  value={String(enterprises.essCount)}
                />
              ) : null}
              {enterprises.rgeCount !== null ? (
                <DataRow
                  label="RGE (échantillon)"
                  value={String(enterprises.rgeCount)}
                />
              ) : null}
              {enterprises.staffSizeBands.length > 0 ? (
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Tranches d&apos;effectif (échantillon)
                  </dt>
                  <dd className="mt-2">
                    <ul className="space-y-1 text-sm text-slate-700">
                      {enterprises.staffSizeBands.map((band) => (
                        <li key={band.code}>
                          {band.label} — {band.count}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              {enterprises.topActivitySections.length > 0 ? (
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Secteurs dominants (échantillon)
                  </dt>
                  <dd className="mt-2">
                    <ul className="space-y-1 text-sm text-slate-700">
                      {enterprises.topActivitySections.map((section) => (
                        <li key={section.code}>
                          {section.label} ({section.code}) — {section.count}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              <p className="text-xs text-slate-500">{enterprises.note}</p>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Donnée non disponible</p>
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Équipements — BPE 2024
          </h3>
          {equipments?.available ? (
            <dl className="mt-3 space-y-3">
              <DataRow
                label="Total équipements"
                value={new Intl.NumberFormat("fr-FR").format(
                  equipments.totalEquipments,
                )}
              />
              {derived && derived.equipmentsPer1000Residents != null ? (
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
                    Par domaine
                  </dt>
                  <dd className="mt-2">
                    <ul className="space-y-1 text-sm text-slate-700">
                      {equipments.byDomain.map((domain) => (
                        <li key={domain.code}>
                          {domain.label} —{" "}
                          {new Intl.NumberFormat("fr-FR").format(domain.count)}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              {equipments.byType.length > 0 ? (
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Principaux types
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
                equipments?.note ??
                "Données BPE non disponibles. Exécutez « npm run ingest:bpe »."
              }
            />
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Transports — BPE 2024
          </h3>
          {equipments?.transport.available ? (
            <dl className="mt-3 space-y-3">
              <DataRow
                label="Équipements recensés"
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
                equipments?.transport.note ??
                "Données de transport non disponibles."
              }
            />
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Risques — Géorisques
          </h3>
          {risks?.available ? (
            <dl className="mt-3 space-y-3">
              {risks.radon ? (
                <DataRow label="Radon" value={risks.radon.label} />
              ) : null}
              {risks.flood ? (
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Inondation (AZI)
                  </dt>
                  <dd className="mt-2">
                    <ul className="space-y-1 text-sm text-slate-700">
                      {risks.flood.zones.map((zone) => (
                        <li key={zone}>{zone}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              {risks.catNatEvents.length > 0 ? (
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    CATNAT récentes
                  </dt>
                  <dd className="mt-2">
                    <ul className="space-y-1 text-sm text-slate-700">
                      {risks.catNatEvents.map((event) => (
                        <li key={`${event.label}-${event.startDate}`}>
                          {event.label}
                          {event.startDate ? ` (${event.startDate})` : ""}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              <p className="text-xs text-slate-500">{risks.note}</p>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Donnée non disponible</p>
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Logements sociaux — RPLS
          </h3>
          {housing?.available ? (
            <dl className="mt-3 space-y-3">
              <DataRow
                label="Parc total"
                value={formatPopulation(housing.totalUnits)}
              />
              <DataRow
                label="Logements loués"
                value={formatPopulation(housing.occupiedUnits)}
              />
              <DataRow
                label="Logements vacants"
                value={formatPopulation(housing.vacantUnits)}
              />
              {housing.totalDwellings !== null ? (
                <DataRow
                  label="Parc de logements (RP 2021)"
                  value={formatPopulation(housing.totalDwellings)}
                />
              ) : null}
              {housing.socialHousingSharePercent !== null ? (
                <DataRow
                  label="Part du parc global"
                  value={formatPercent(housing.socialHousingSharePercent)}
                />
              ) : null}
              {housing.vacancyRatePercent !== null ? (
                <DataRow
                  label="Taux de vacance (RPLS)"
                  value={formatPercent(housing.vacancyRatePercent)}
                />
              ) : null}
              <p className="text-xs text-slate-500">{housing.note}</p>
            </dl>
          ) : (
            <SectionUnavailable
              message={housing?.note ?? "Données RPLS non disponibles."}
            />
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Mobilité — IRVE
          </h3>
          {mobility?.available ? (
            <dl className="mt-3 space-y-3">
              <DataRow
                label="Points de charge"
                value={new Intl.NumberFormat("fr-FR").format(
                  mobility.chargingPoints,
                )}
              />
              <DataRow
                label="Stations recensées"
                value={new Intl.NumberFormat("fr-FR").format(mobility.stations)}
              />
              {derived && derived.irvePointsPer1000Residents != null ? (
                <DataRow
                  label="Points de charge pour 1 000 hab."
                  value={new Intl.NumberFormat("fr-FR", {
                    maximumFractionDigits: 1,
                  }).format(derived.irvePointsPer1000Residents)}
                />
              ) : null}
              <p className="text-xs text-slate-500">{mobility.note}</p>
            </dl>
          ) : (
            <SectionUnavailable
              message={mobility?.note ?? "Données IRVE non disponibles."}
            />
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Fiscalité locale — REI
          </h3>
          {fiscal?.available ? (
            <dl className="mt-3 space-y-3">
              <DataRow
                label="Taux taxe foncière bâti"
                value={formatRate(fiscal.propertyTaxBuiltRate)}
              />
              <DataRow
                label="Taux taxe foncière non bâti"
                value={formatRate(fiscal.propertyTaxUnbuiltRate)}
              />
              <p className="text-xs text-slate-500">{fiscal.note}</p>
            </dl>
          ) : (
            <SectionUnavailable
              message={fiscal?.note ?? "Données REI non disponibles."}
            />
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Géographie — AAV & EPCI
          </h3>
          <dl className="mt-3 space-y-3">
            {geography?.attractionArea?.available ? (
              <>
                <DataRow
                  label="Aire d'attraction"
                  value={
                    geography.attractionArea.label
                      ? `${geography.attractionArea.label} (${geography.attractionArea.code})`
                      : geography.attractionArea.code
                  }
                />
                <DataRow
                  label="Typologie AAV"
                  value={geography.attractionArea.categoryLabel}
                />
              </>
            ) : (
              <SectionUnavailable
                message={
                  geography?.attractionArea?.note ??
                  "Données AAV non disponibles."
                }
              />
            )}
            {geography?.epciComparison?.available ? (
              <>
                <DataRow
                  label="Rang population (EPCI)"
                  value={
                    geography.epciComparison.communeRankByPopulation !== null
                      ? `${geography.epciComparison.communeRankByPopulation} / ${geography.epciComparison.communeCount}`
                      : "Donnée non disponible"
                  }
                />
                <DataRow
                  label="Rang densité (EPCI)"
                  value={
                    geography.epciComparison.communeRankByDensity !== null
                      ? `${geography.epciComparison.communeRankByDensity} / ${geography.epciComparison.communeCount}`
                      : "Donnée non disponible"
                  }
                />
                <DataRow
                  label="Population moyenne EPCI"
                  value={formatPopulation(
                    geography.epciComparison.epciAveragePopulation,
                  )}
                />
                <DataRow
                  label="Densité moyenne EPCI"
                  value={formatDensity(geography.epciComparison.epciAverageDensity)}
                />
                <p className="text-xs text-slate-500">
                  {geography.epciComparison.note}
                </p>
              </>
            ) : null}
          </dl>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Immobilier — DVF
          </h3>
          {property?.available ? (
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
              {property.priceHistory.length > 1 ? (
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Évolution prix au m²
                  </dt>
                  <dd className="mt-2">
                    <ul className="space-y-1 text-sm text-slate-700">
                      {property.priceHistory.map((point) => (
                        <li key={point.year}>
                          {point.year} —{" "}
                          {formatPropertyPrice(
                            point.averagePricePerM2,
                            point.mutationCount,
                          )}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              <p className="text-xs text-slate-500">{property.note}</p>
            </dl>
          ) : (
            <SectionUnavailable
              message={property?.note ?? "Données DVF non disponibles."}
            />
          )}
        </div>
      </div>
    </section>
  );
}
