import type { PropertyMarketSnapshot, SocialHousingSnapshot, TerritoryProfile } from "../types";
import type { NumericBinding } from "./types";
import {
  HIGH_REAL_ESTATE_PREMIUM_RATIO,
  qualifiesAsProfileAwareLovacWatchPoint,
  qualifiesAsProfileAwareVacancyWatchPoint,
  resolveComparisonProfile,
} from "../typology/thresholds";
import { formatPercent, formatPricePerM2 } from "./format";

export const DUAL_VACANCY_QUALIFICATION_REASON = "vacance_residentielle_deux_registres";
export const VACANCY_PRICE_TENSION_QUALIFICATION_REASON =
  "vacance_prix_immobilier_tension";

/** Aligné sur `DVF_LOW_MUTATION_THRESHOLD` (`lib/ux/source-guides.ts`). */
export const DVF_MIN_MUTATIONS_FOR_VACANCY_CROSS = 10;

const DVF_CROSS_LIMITATIONS = [
  "Moyennes agrégées sur les ventes immobilières enregistrées.",
  "Pas de distinction neuf/ancien, standing, biens atypiques, lots multiples, dépendances ni terrains nus.",
];

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function qualifiesAsDualVacancy(territory: TerritoryProfile): boolean {
  const housing = territory.enrichment?.housing;
  if (!housing?.available) {
    return false;
  }

  const rpVacancy = housing.rpVacancyRatePercent;
  const lovacVacancy = housing.privateVacancyRatePercent;

  if (
    rpVacancy === null ||
    lovacVacancy === null ||
    housing.lovacVintage === null
  ) {
    return false;
  }

  const profile = resolveComparisonProfile(territory);
  return (
    qualifiesAsProfileAwareVacancyWatchPoint(rpVacancy, profile) &&
    qualifiesAsProfileAwareLovacWatchPoint(lovacVacancy, profile)
  );
}

export function qualifiesAsElevatedRpVacancy(territory: TerritoryProfile): boolean {
  const rate = territory.enrichment?.housing?.rpVacancyRatePercent;
  if (rate === null || rate === undefined) {
    return false;
  }

  return qualifiesAsProfileAwareVacancyWatchPoint(
    rate,
    resolveComparisonProfile(territory),
  );
}

export function qualifiesAsElevatedLovacVacancy(territory: TerritoryProfile): boolean {
  const housing = territory.enrichment?.housing;
  if (!housing?.available || housing.privateVacancyRatePercent === null) {
    return false;
  }

  return qualifiesAsProfileAwareLovacWatchPoint(
    housing.privateVacancyRatePercent,
    resolveComparisonProfile(territory),
  );
}

export function qualifiesAsElevatedVacancy(territory: TerritoryProfile): boolean {
  return (
    qualifiesAsDualVacancy(territory) ||
    qualifiesAsElevatedRpVacancy(territory) ||
    qualifiesAsElevatedLovacVacancy(territory)
  );
}

export function computeRealEstatePremiumRatio(territory: TerritoryProfile): number | null {
  const property = territory.enrichment?.property;
  if (!property?.available || property.averagePricePerM2 === null) {
    return null;
  }

  const departmentAverage = property.departmentAveragePricePerM2;
  if (departmentAverage === null || departmentAverage <= 0) {
    return null;
  }

  return roundOneDecimal(property.averagePricePerM2 / departmentAverage);
}

export function computeLovacRpVacancySpreadPercent(territory: TerritoryProfile): number | null {
  const housing = territory.enrichment?.housing;
  if (!housing?.available) {
    return null;
  }

  const rpVacancy = housing.rpVacancyRatePercent;
  const lovacVacancy = housing.privateVacancyRatePercent;

  if (rpVacancy === null || lovacVacancy === null) {
    return null;
  }

  return roundOneDecimal(lovacVacancy - rpVacancy);
}

export function isDvfRobustForVacancyCross(territory: TerritoryProfile): boolean {
  const property = territory.enrichment?.property;
  if (!property?.available) {
    return false;
  }

  const mutations = property.mutationCount;
  return mutations !== null && mutations >= DVF_MIN_MUTATIONS_FOR_VACANCY_CROSS;
}

export function qualifiesAsRealEstatePremium(territory: TerritoryProfile): boolean {
  const ratio = computeRealEstatePremiumRatio(territory);
  return ratio !== null && ratio >= HIGH_REAL_ESTATE_PREMIUM_RATIO;
}

export function qualifiesAsVacancyPriceTension(territory: TerritoryProfile): boolean {
  return (
    qualifiesAsElevatedVacancy(territory) &&
    qualifiesAsRealEstatePremium(territory) &&
    isDvfRobustForVacancyCross(territory)
  );
}

export function shouldEmitVacancyPriceTensionWatchPoint(territory: TerritoryProfile): boolean {
  return qualifiesAsVacancyPriceTension(territory) && !qualifiesAsDualVacancy(territory);
}

export function suppressIsolatedVacancyWatchPoint(territory: TerritoryProfile): boolean {
  return qualifiesAsDualVacancy(territory) || shouldEmitVacancyPriceTensionWatchPoint(territory);
}

export function isDualVacancyWatchPointFact(fact: { sourceKeys: string[] }): boolean {
  return (
    fact.sourceKeys.includes("insee-rp-logement") &&
    fact.sourceKeys.includes("cerema-lovac") &&
    !fact.sourceKeys.includes("dvf")
  );
}

export function isVacancyPriceTensionWatchPointFact(fact: { sourceKeys: string[] }): boolean {
  return (
    fact.sourceKeys.includes("dvf") &&
    (fact.sourceKeys.includes("insee-rp-logement") ||
      fact.sourceKeys.includes("cerema-lovac"))
  );
}

export function resolveVacancyPriceTensionSourceKeys(territory: TerritoryProfile): string[] {
  const keys = ["dvf"];

  if (qualifiesAsElevatedRpVacancy(territory)) {
    keys.push("insee-rp-logement");
  }

  if (qualifiesAsElevatedLovacVacancy(territory)) {
    keys.push("cerema-lovac");
  }

  return keys;
}

export function buildDualVacancyWatchPointSentence(housing: SocialHousingSnapshot): string {
  const rpRate = housing.rpVacancyRatePercent!;
  const lovacRate = housing.privateVacancyRatePercent!;
  const rpYear = housing.year;
  const lovacVintage = housing.lovacVintage!;

  const structuralPart =
    housing.privateVacantStructural != null
      ? `, dont ${housing.privateVacantStructural.toLocaleString("fr-FR")} vacants depuis au moins deux ans sur le parc privé`
      : "";

  return (
    `La vacance résidentielle apparaît élevée selon deux registres distincts : ` +
    `${formatPercent(rpRate)} de logements vacants au recensement ${rpYear} (INSEE) ` +
    `et ${formatPercent(lovacRate)} sur le parc privé au 1er janvier ${lovacVintage} (LOVAC)${structuralPart}.`
  );
}

export function buildDualVacancyWatchPointEvidence(housing: SocialHousingSnapshot): string[] {
  const evidence = [
    `Vacance RP : ${formatPercent(housing.rpVacancyRatePercent!)} (${housing.year})`,
    `Vacance parc privé LOVAC : ${formatPercent(housing.privateVacancyRatePercent!)} (${housing.lovacVintage})`,
  ];

  if (housing.privateVacantStructural != null) {
    evidence.push(
      `Vacance structurelle LOVAC (≥ 2 ans) : ${housing.privateVacantStructural.toLocaleString("fr-FR")} logements`,
    );
  }

  return evidence;
}

export function dualVacancyWatchPointLimitations(
  housing: SocialHousingSnapshot,
  territory?: TerritoryProfile,
): string[] {
  const limitations = [
    "Recensement (ensemble des logements) et LOVAC (parc privé vacant, sources fiscales) — définitions et millésimes distincts ; le croisement consolide le signal sans les fusionner.",
    housing.lovacNote ?? "Surestimation possible du parc privé vacant LOVAC vs recensement.",
  ];

  if (
    territory &&
    qualifiesAsVacancyPriceTension(territory) &&
    qualifiesAsDualVacancy(territory)
  ) {
    const property = territory.enrichment?.property;
    if (property?.averagePricePerM2 != null && property.departmentAveragePricePerM2 != null) {
      limitations.push(
        `Le prix moyen DVF (${formatPricePerM2(property.averagePricePerM2)}) est supérieur à la référence départementale (${formatPricePerM2(property.departmentAveragePricePerM2)}) — discordance possible avec la vacance, sans attribution de cause.`,
      );
    }
  }

  return limitations;
}

export function buildVacancyPriceTensionWatchPointSentence(
  territory: TerritoryProfile,
): string {
  const property = territory.enrichment!.property!;
  const communePrice = property.averagePricePerM2!;
  const departmentPrice = property.departmentAveragePricePerM2!;

  return (
    `La vacance élevée coexiste avec un prix immobilier supérieur à la référence départementale ` +
    `(${formatPricePerM2(communePrice)} vs ${formatPricePerM2(departmentPrice)}, DVF ${property.year}), ` +
    `ce qui signale une tension ou une discordance locale du marché, sans permettre d'en attribuer la cause.`
  );
}

export function buildVacancyPriceTensionWatchPointEvidence(
  territory: TerritoryProfile,
): string[] {
  const housing = territory.enrichment?.housing;
  const property = territory.enrichment?.property;
  const evidence: string[] = [];

  if (housing?.rpVacancyRatePercent != null && qualifiesAsElevatedRpVacancy(territory)) {
    evidence.push(
      `Vacance RP : ${formatPercent(housing.rpVacancyRatePercent)} (${housing.year})`,
    );
  }

  if (
    housing?.privateVacancyRatePercent != null &&
    qualifiesAsElevatedLovacVacancy(territory)
  ) {
    evidence.push(
      `Vacance parc privé LOVAC : ${formatPercent(housing.privateVacancyRatePercent)} (${housing.lovacVintage})`,
    );
  }

  if (property?.averagePricePerM2 != null && property.departmentAveragePricePerM2 != null) {
    const ratio = computeRealEstatePremiumRatio(territory);
    evidence.push(
      `Prix moyen DVF : ${formatPricePerM2(property.averagePricePerM2)} (réf. département : ${formatPricePerM2(property.departmentAveragePricePerM2)}${ratio != null ? `, ratio ${ratio}` : ""})`,
    );
  }

  if (property?.mutationCount != null) {
    evidence.push(
      `${property.mutationCount.toLocaleString("fr-FR")} ventes enregistrées en ${property.year}`,
    );
  }

  return evidence;
}

export function vacancyPriceTensionWatchPointLimitations(
  territory: TerritoryProfile,
): string[] {
  const property = territory.enrichment?.property;
  const limitations = [
    "Vacance et prix DVF — registres et millésimes distincts ; la coexistence ne permet pas d'attribuer la cause (résidences secondaires, saisonnier, volume de ventes, etc.).",
    ...DVF_CROSS_LIMITATIONS,
  ];

  if (
    property?.mutationCount != null &&
    property.mutationCount < DVF_MIN_MUTATIONS_FOR_VACANCY_CROSS * 3
  ) {
    limitations.push(
      `Volume de mutations DVF modeste (${property.mutationCount.toLocaleString("fr-FR")}) : interpréter le prix moyen avec prudence.`,
    );
  }

  return limitations;
}

export function vacancyPriceTensionNumericBindings(
  territory: TerritoryProfile,
  property: PropertyMarketSnapshot,
): NumericBinding[] {
  const bindings: NumericBinding[] = [
    {
      value: property.averagePricePerM2!,
      label: "prix moyen DVF communal",
      theme: "housing",
      allowedContexts: ["prix", "€/m²", "DVF", "immobilier"],
    },
    {
      value: property.departmentAveragePricePerM2!,
      label: "prix moyen DVF département",
      theme: "housing",
      allowedContexts: ["référence départementale", "DVF", "€/m²"],
    },
  ];

  const ratio = computeRealEstatePremiumRatio(territory);
  if (ratio != null) {
    bindings.push({
      value: ratio,
      label: "ratio prix communal / département",
      theme: "housing",
      allowedContexts: ["ratio", "DVF", "département"],
    });
  }

  const housing = territory.enrichment?.housing;
  if (housing?.rpVacancyRatePercent != null && qualifiesAsElevatedRpVacancy(territory)) {
    bindings.push({
      value: housing.rpVacancyRatePercent,
      label: "part logements vacants RP",
      theme: "housing",
      allowedContexts: ["vacance", "logements vacants", "INSEE"],
    });
  }

  if (
    housing?.privateVacancyRatePercent != null &&
    qualifiesAsElevatedLovacVacancy(territory)
  ) {
    bindings.push({
      value: housing.privateVacancyRatePercent,
      label: "taux vacance parc privé LOVAC",
      theme: "housing",
      allowedContexts: ["LOVAC", "parc privé", "vacance"],
    });
  }

  return bindings;
}
