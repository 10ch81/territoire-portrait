import type { TerritoryEnrichment, TerritoryProfile } from "./types";

function isPresent(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function pushUnique(limits: string[], message: string): void {
  if (!limits.includes(message)) {
    limits.push(message);
  }
}

function appendUnavailable(
  limits: string[],
  available: boolean | undefined,
  fallback: string,
  note: string | undefined,
): void {
  if (available) {
    return;
  }

  pushUnique(limits, note?.trim() || fallback);
}

function hasEducationEquipments(enrichment: TerritoryEnrichment): boolean {
  const equipments = enrichment.equipments;
  if (!equipments?.available) {
    return false;
  }

  const hasEducationDomain = equipments.byDomain.some(
    (domain) => domain.code === "C" && domain.count > 0,
  );
  const hasEducationType = equipments.byType.some(
    (type) => type.code.startsWith("C") && type.count > 0,
  );

  return hasEducationDomain || hasEducationType;
}

function appendEmploymentLimits(
  limits: string[],
  enrichment: TerritoryEnrichment,
): void {
  const sociodemographics = enrichment.sociodemographics;

  if (!sociodemographics?.available) {
    return;
  }

  const hasUnemployment = isPresent(sociodemographics.unemploymentRate);
  const hasIncome = isPresent(sociodemographics.medianDisposableIncome);
  const hasAgeBands = sociodemographics.ageBands.length > 0;

  if (!hasUnemployment && !hasIncome && !hasAgeBands) {
    pushUnique(
      limits,
      "Données socio-démographiques (RP 2021 / FILOSOFI) absentes pour cette commune.",
    );
    return;
  }

  if (!hasUnemployment) {
    pushUnique(limits, "Taux de chômage 15-64 (RP 2021) non disponible.");
  }

  if (!hasIncome) {
    pushUnique(
      limits,
      "Revenu médian disponible (FILOSOFI) non disponible.",
    );
  }

  pushUnique(
    limits,
    "Emplois salariés au lieu de travail, taux d'activité et répartition sectorielle de l'emploi (hors SIRENE) non disponibles.",
  );
}

function appendEnterpriseLimits(
  limits: string[],
  enrichment: TerritoryEnrichment,
): void {
  const enterprises = enrichment.enterprises;

  if (!enterprises) {
    pushUnique(limits, "Données entreprises (SIRENE) non disponibles.");
    return;
  }

  const totalLabel = isPresent(enterprises.legalUnitsWithEstablishment)
    ? enterprises.legalUnitsIsCapped
      ? `≥ ${enterprises.legalUnitsWithEstablishment} unités légales recensées (plafond API)`
      : `${enterprises.legalUnitsWithEstablishment} unités légales recensées`
    : "total communal inconnu";

  pushUnique(
    limits,
    `Données économiques SIRENE limitées aux comptages d'unités légales, ESS et RGE (${totalLabel}) : pas de répartition sectorielle ni de tranches d'effectif fiables.`,
  );
}

function appendPropertyLimits(
  limits: string[],
  enrichment: TerritoryEnrichment,
): void {
  const property = enrichment.property;

  if (!property?.available) {
    appendUnavailable(
      limits,
      property?.available,
      "Indicateurs immobiliers (DVF) non disponibles.",
      property?.note,
    );
    return;
  }

  const hasTypologySplit =
    isPresent(property.houseMutations) || isPresent(property.apartmentMutations);

  if (hasTypologySplit) {
    pushUnique(
      limits,
      "Prix DVF agrégés sur les mutations enregistrées, avec répartition maisons/appartements ; pas de distinction neuf/ancien ni de standing.",
    );
    return;
  }

  pushUnique(
    limits,
    "Prix DVF agrégés sur les mutations enregistrées, sans typologie détaillée des biens.",
  );
}

function appendEquipmentLimits(
  limits: string[],
  enrichment: TerritoryEnrichment,
): void {
  const equipments = enrichment.equipments;

  if (!equipments?.available) {
    appendUnavailable(
      limits,
      equipments?.available,
      "Équipements (BPE) non disponibles.",
      equipments?.note,
    );
    return;
  }

  if (hasEducationEquipments(enrichment)) {
    pushUnique(
      limits,
      "Équipements BPE : dénombrement des équipements (dont enseignement et services de proximité) ; pas d'accessibilité, de qualité, de capacité scolaire ni de résultats.",
    );
    return;
  }

  pushUnique(
    limits,
    "Équipements BPE : dénombrement uniquement ; pas d'accessibilité, de qualité ni d'adéquation aux besoins.",
  );
}

function appendFiscalLimits(
  limits: string[],
  enrichment: TerritoryEnrichment,
): void {
  const fiscal = enrichment.fiscal;

  if (!fiscal?.available) {
    appendUnavailable(
      limits,
      fiscal?.available,
      "Fiscalité locale (REI) non disponible.",
      fiscal?.note,
    );
    return;
  }

  pushUnique(
    limits,
    "Fiscalité locale : taux d'imposition communaux (REI) uniquement, sans bases fiscales ni recettes communales.",
  );
}

/**
 * Limites de données calculées côté serveur à partir de l'enrichissement réel.
 * Source de vérité pour l'affichage — indépendante de la réponse Mistral.
 */
export function computeDataLimits(territory: TerritoryProfile): string[] {
  const limits: string[] = [];
  const enrichment = territory.enrichment;

  if (!enrichment) {
    pushUnique(
      limits,
      "Aucune donnée enrichie disponible pour cette commune (cache local ou ingestion absent).",
    );
    return limits;
  }

  appendUnavailable(
    limits,
    enrichment.populationHistory?.available,
    "Historique de population (INSEE) non disponible.",
    enrichment.populationHistory?.note,
  );

  appendUnavailable(
    limits,
    enrichment.populationHistory?.available,
    "Historique de population (INSEE) non disponible.",
    enrichment.populationHistory?.note,
  );

  if (!enrichment.sociodemographics?.available) {
    appendUnavailable(
      limits,
      enrichment.sociodemographics?.available,
      "Données socio-démographiques (RP 2021 / FILOSOFI) non disponibles.",
      enrichment.sociodemographics?.note,
    );
  } else {
    appendEmploymentLimits(limits, enrichment);
  }

  appendEnterpriseLimits(limits, enrichment);

  appendEquipmentLimits(limits, enrichment);

  if (enrichment.housing?.available) {
    pushUnique(
      limits,
      "Données RPLS limitées au parc locatif social ; pas de couverture du marché immobilier privé (location ou accession).",
    );
  } else {
    appendUnavailable(
      limits,
      enrichment.housing?.available,
      "Données logement social (RPLS) non disponibles.",
      enrichment.housing?.note,
    );
  }

  appendPropertyLimits(limits, enrichment);

  appendFiscalLimits(limits, enrichment);

  appendUnavailable(
    limits,
    enrichment.risks?.available,
    "Données de risques (Géorisques) non disponibles.",
    enrichment.risks?.note,
  );

  appendUnavailable(
    limits,
    enrichment.mobility?.available,
    "Données IRVE (bornes de recharge) non disponibles.",
    enrichment.mobility?.note,
  );

  if (!enrichment.geography?.attractionArea?.available) {
    appendUnavailable(
      limits,
      enrichment.geography?.attractionArea?.available,
      "Zonage en aire d'attraction (AAV 2020) non disponible.",
      enrichment.geography?.attractionArea?.note,
    );
  }

  return limits;
}
