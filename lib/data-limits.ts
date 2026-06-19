import type { TerritoryEnrichment, TerritoryProfile } from "./types";
import { FILOSOFI_VINTAGE, RP_VINTAGE } from "./sources";
import { getPopulationDisplayMeta } from "./ux/population";

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
      `Données socio-démographiques (RP ${RP_VINTAGE} / FILOSOFI ${FILOSOFI_VINTAGE}) absentes pour cette commune.`,
    );
    return;
  }

  if (!hasUnemployment) {
    pushUnique(limits, `Taux de chômage 15-64 (RP ${RP_VINTAGE}) non disponible.`);
  }

  if (!hasIncome) {
    pushUnique(
      limits,
      "Niveau de vie médian (FILOSOFI) non disponible.",
    );
  }

  if (enrichment.employmentSectors?.available) {
    pushUnique(
      limits,
      "Taux d'activité non disponible ; les postes salariés sont décrits via FLORES, avec un périmètre distinct des emplois au sens du recensement.",
    );
  } else {
    pushUnique(
      limits,
      "Emplois salariés au lieu de travail et taux d'activité (hors SIRENE) non disponibles.",
    );
  }

  if (!enrichment.employmentSectors?.available) {
    pushUnique(
      limits,
      "Répartition sectorielle de l'emploi salarié (FLORES A17) non disponible.",
    );
  }
}

function appendLabourMarketLimits(
  limits: string[],
  enrichment: TerritoryEnrichment,
): void {
  if (enrichment.labourMarket?.available) {
    pushUnique(
      limits,
      `France Travail (${enrichment.labourMarket.quarter ?? "trimestre récent"}) : inscrits catégorie ABC — distinct du chômage RP ${RP_VINTAGE} ; effectifs arrondis au multiple de 5 ; prudence sur petites communes et depuis 2025 (inscription automatique).`,
    );
    return;
  }

  if (enrichment.labourMarket?.note) {
    pushUnique(limits, enrichment.labourMarket.note);
  }
}

function appendSocialBenefitsLimits(
  limits: string[],
  enrichment: TerritoryEnrichment,
): void {
  if (enrichment.socialBenefits?.available) {
    pushUnique(
      limits,
      `CNAF (${enrichment.socialBenefits.rsaVintage ?? "millésime récent"}) : part des allocataires RSA parmi les ménages — indicateur partiel ; ne couvre pas l'ensemble des prestations CAF (AAH, prime d'activité, aides logement, etc.).`,
    );
  }

  if (enrichment.socialBenefits?.note && !enrichment.socialBenefits.available) {
    pushUnique(limits, enrichment.socialBenefits.note);
  }
}

function appendPopulationLimits(
  limits: string[],
  territory: TerritoryProfile,
): void {
  const meta = getPopulationDisplayMeta(territory);

  pushUnique(
    limits,
    `Population affichée : ${meta.definition} (millésime ${meta.vintage}, API Géo).`,
  );

  for (const note of meta.consistencyNotes) {
    pushUnique(limits, note);
  }
}

function appendEnterpriseLimits(
  limits: string[],
  enrichment: TerritoryEnrichment,
): void {
  const enterprises = enrichment.enterprises;

  if (!enterprises) {
    pushUnique(limits, "Données entreprises (SIDE / SIRENE) non disponibles.");
    return;
  }

  if (enterprises.inseeLegalUnits !== null) {
    pushUnique(
      limits,
      `Économie : référence statistique SIDE INSEE (${enterprises.inseeSideYear}) pour unités légales et établissements actifs ; SIRENE API = répertoire administratif complémentaire, pas indicateur de dynamisme.`,
    );
  } else {
    const totalLabel = isPresent(enterprises.legalUnitsWithEstablishment)
      ? enterprises.legalUnitsIsCapped
        ? `≥ ${enterprises.legalUnitsWithEstablishment} unités légales recensées (plafond API)`
        : `${enterprises.legalUnitsWithEstablishment} unités légales recensées`
      : "total communal inconnu";

    pushUnique(
      limits,
      `Données économiques SIRENE limitées aux comptages d'unités légales, ESS et RGE (${totalLabel}) : répertoire administratif, pas preuve de dynamisme économique.`,
    );
  }

  if (enterprises.divergenceWarning) {
    pushUnique(limits, enterprises.divergenceWarning);
  }

  if (enrichment.employmentSectors?.available) {
    pushUnique(
      limits,
      "FLORES INSEE (A17) : postes salariés fin d'année et établissements par secteur — ne pas analyser l'évolution temporelle ; distinct de SIDE (stocks UL/ET).",
    );
  } else {
    pushUnique(
      limits,
      "Pas de répartition sectorielle ni de tranches d'effectif salarié fiables.",
    );
  }
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
      "Prix DVF agrégés sur les mutations enregistrées (moyennes communales), avec répartition maisons/appartements ; pas de distinction neuf/ancien, standing, biens atypiques, lots multiples, dépendances ni terrains nus.",
    );
    return;
  }

  pushUnique(
    limits,
    "Prix DVF agrégés sur les mutations enregistrées (moyennes communales), sans typologie détaillée ; pas de distinction neuf/ancien, standing, biens atypiques, lots multiples, dépendances ni terrains nus.",
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
      "Équipements BPE : le total correspond aux occurrences recensées ; les domaines indiquent le nombre de types par domaine (décomposition partielle). Les principaux types (top 8) sont une liste partielle, non exhaustive.",
    );
    return;
  }

  pushUnique(
    limits,
    "Équipements BPE : dénombrement par domaine et principaux types (liste partielle) ; pas d'accessibilité, de qualité ni d'adéquation aux besoins.",
  );
}

function appendFiscalLimits(
  limits: string[],
  enrichment: TerritoryEnrichment,
): void {
  const fiscal = enrichment.fiscal;
  const publicAccounts = enrichment.publicAccounts;
  const hasRei = fiscal?.available === true;
  const hasOfgl = publicAccounts?.available === true;

  if (!hasRei && !hasOfgl) {
    appendUnavailable(
      limits,
      hasRei || hasOfgl,
      "Finances locales (REI / OFGL) non disponibles.",
      fiscal?.note ?? publicAccounts?.note,
    );
    return;
  }

  if (hasRei) {
    pushUnique(
      limits,
      "Fiscalité locale : taux d'imposition communaux (REI) uniquement, sans bases fiscales.",
    );
  }

  if (hasOfgl) {
    pushUnique(
      limits,
      "Comptes publics OFGL : encours de dette et recettes de fonctionnement (budget principal) ; pas de dépenses détaillées ni d'années antérieures dans le portrait.",
    );
  } else if (hasRei) {
    pushUnique(
      limits,
      "Recettes et dette communale (OFGL) non disponibles pour cette commune.",
    );
  }
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

  appendPopulationLimits(limits, territory);

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
      `Données socio-démographiques (RP ${RP_VINTAGE} / FILOSOFI ${FILOSOFI_VINTAGE}) non disponibles.`,
      enrichment.sociodemographics?.note,
    );
  } else {
    appendEmploymentLimits(limits, enrichment);
  }

  appendLabourMarketLimits(limits, enrichment);

  appendSocialBenefitsLimits(limits, enrichment);

  appendEnterpriseLimits(limits, enrichment);

  appendEquipmentLimits(limits, enrichment);

  if (enrichment.education?.available) {
    pushUnique(
      limits,
      "Scolarisation (Annuaire Éducation) : agrégats d'établissements ouverts ; complémentaire au BPE, sans liste nominative.",
    );
  }

  if (enrichment.education?.averageIps != null && enrichment.education?.ipsNote) {
    pushUnique(limits, enrichment.education.ipsNote);
  }

  if (enrichment.health?.available) {
    pushUnique(
      limits,
      "FINESS : établissements sanitaires et sociaux ouverts ; ne mesure pas l'accessibilité géographique ni la desserte populationnelle.",
    );
  } else {
    appendUnavailable(
      limits,
      enrichment.health?.available,
      "Données santé (FINESS) non disponibles.",
      enrichment.health?.note,
    );
  }

  pushUnique(
    limits,
    "APL DREES (accessibilité aux soins) : non intégrée — pas de bulk communal CSV/JSON ≤ 20 Mo (export data.drees vide ; jeux data.gouv en xlsx/7z).",
  );

  appendPropertyLimits(limits, enrichment);

  appendFiscalLimits(limits, enrichment);

  appendUnavailable(
    limits,
    enrichment.risks?.available,
    "Données de risques (Géorisques) non disponibles.",
    enrichment.risks?.note,
  );

  if (enrichment.housing?.available) {
    pushUnique(
      limits,
      "Données RPLS limitées au parc locatif social ; la vacance générale (RP logement) couvre l'ensemble du parc.",
    );
    if (enrichment.housing.privateVacantDwellings !== null) {
      pushUnique(
        limits,
        "LOVAC : vacance du parc privé (sources fiscales Cerema/DGFiP) — distincte du recensement RP ; surestimation possible (logements fiscalement vacants).",
      );
    } else if (enrichment.housing.lovacNote) {
      pushUnique(limits, enrichment.housing.lovacNote);
    }
  } else {
    appendUnavailable(
      limits,
      enrichment.housing?.available,
      "Données logement social (RPLS) non disponibles.",
      enrichment.housing?.note,
    );
  }

  if (enrichment.security?.available) {
    pushUnique(
      limits,
      "Sécurité (SSMSI) : faits enregistrés par la police/gendarmerie (lieu de commission) ; ne mesure pas le ressenti d'insécurité ni les faits non déclarés ; couverture communale partielle.",
    );
    pushUnique(
      limits,
      "Sécurité (SSMSI) : une seule année chargée — pas d'analyse de tendance interannuelle.",
    );
  } else {
    appendUnavailable(
      limits,
      enrichment.security?.available,
      "Données de sécurité (SSMSI) non disponibles pour cette commune.",
      enrichment.security?.note,
    );
  }

  appendUnavailable(
    limits,
    enrichment.mobility?.irve.available ||
      enrichment.mobility?.commute.available ||
      enrichment.mobility?.connectivity.available,
    "Données de mobilité non disponibles.",
    enrichment.mobility?.irve.note,
  );

  if (enrichment.mobility?.connectivity.available) {
    pushUnique(
      limits,
      "Couverture fibre (ARCEP) : estimation basée sur les IPE opérateurs ; distincte de la mobilité physique et des bornes IRVE.",
    );
  }

  if (enrichment.mobility?.commute.available) {
    pushUnique(
      limits,
      `Mobilité domicile-travail (RP ${RP_VINTAGE}) : mode principal déclaré ; l'offre horaire de transport collectif n'est pas intégrée (BPE domaine E pour les équipements).`,
    );
  }

  if (enrichment.urbanPolicy?.available && enrichment.urbanPolicy.hasQpv) {
    pushUnique(
      limits,
      "QPV : périmètres quartiers prioritaires 2024 ; ne pas confondre avec la totalité de la commune.",
    );
  } else {
    appendUnavailable(
      limits,
      enrichment.urbanPolicy?.available,
      "Données QPV non disponibles.",
      enrichment.urbanPolicy?.note,
    );
  }

  if (!enrichment.geography?.attractionArea?.available) {
    appendUnavailable(
      limits,
      enrichment.geography?.attractionArea?.available,
      "Zonage en aire d'attraction (AAV 2020) non disponible.",
      enrichment.geography?.attractionArea?.note,
    );
  }

  const typology = enrichment.territoryTypology;
  if (typology) {
    pushUnique(
      limits,
      "Les typologies communales fournissent un contexte de comparaison et d'interprétation. Elles ne constituent pas à elles seules un diagnostic territorial ni une qualification de fragilité.",
    );

    for (const family of typology.missingFamilies) {
      const label =
        family === "density_grid"
          ? "Grille communale de densité INSEE"
          : family === "attraction_area"
            ? "Aire d'attraction des villes (AAV2020)"
            : family === "urban_unit"
              ? "Unité urbaine 2020"
              : "Dispositifs publics nationaux";
      pushUnique(
        limits,
        `La typologie ${label} n'a pas été trouvée ou n'est pas disponible pour cette commune.`,
      );
    }
  }

  if (enrichment.tourism?.available) {
    pushUnique(
      limits,
      "Tourisme : capacités d'hébergement recensées uniquement ; pas de données de fréquentation — ne pas conclure à un sous-exploitation du potentiel.",
    );
  }

  return limits;
}
