import type { TerritoryProfile } from "../../types";
import { createFact } from "./utils";
import type { AnalysisFact } from "../types";

export function buildOpportunityFacts(territory: TerritoryProfile): AnalysisFact[] {
  const facts: AnalysisFact[] = [];
  const housing = territory.enrichment?.housing;
  const enterprises = territory.enrichment?.enterprises;
  const risks = territory.enrichment?.risks;
  const connectivity = territory.enrichment?.mobility?.connectivity;
  const tourism = territory.enrichment?.tourism;
  const education = territory.enrichment?.education;
  const health = territory.enrichment?.health;
  const commute = territory.enrichment?.mobility?.commute;
  const irve = territory.enrichment?.mobility?.irve;
  const urbanPolicy = territory.enrichment?.urbanPolicy;

  if (
    housing?.available &&
    housing.rpVacancyRatePercent !== null &&
    housing.rpVacancyRatePercent >= 10
  ) {
    facts.push(
      createFact({
        theme: "housing",
        target: "opportunities",
        sentence:
          "Réhabiliter ou requalifier le parc vacant pour limiter la dégradation du bâti et renforcer l'attractivité résidentielle.",
        evidence: [`Vacance RP communale : ${housing.rpVacancyRatePercent} %`],
        sourceKeys: ["insee-rp-logement"],
        year: housing.year,
        confidence: "medium",
        limitations: [
          "Piste d'action territoriale ; ne préjuge pas de faisabilité ni de financement.",
        ],
      }),
    );
  }

  if (enterprises && ((enterprises.essCount ?? 0) > 0 || (enterprises.rgeCount ?? 0) > 0)) {
    facts.push(
      createFact({
        theme: "ess_rge",
        target: "opportunities",
        sentence:
          "Mobiliser les acteurs ESS et RGE identifiés comme ressources potentielles pour des projets locaux (rénovation, services, insertion).",
        evidence: [
          `${enterprises.essCount ?? 0} structure(s) ESS recensée(s)`,
          `${enterprises.rgeCount ?? 0} structure(s) RGE recensée(s)`,
        ],
        sourceKeys: ["sirene"],
        confidence: "medium",
        limitations: [
          "Périmètre SIRENE administratif ; distinct du stock SIDE.",
        ],
      }),
    );
  }

  if (
    risks?.available &&
    ((risks.catNatEvents?.length ?? 0) > 0 || (risks.flood?.count ?? 0) > 0)
  ) {
    facts.push(
      createFact({
        theme: "risks",
        target: "opportunities",
        sentence:
          "Renforcer la prévention et l'adaptation aux risques naturels identifiés (planification, sensibilisation, aménagements).",
        evidence: [
          `${risks.catNatEvents?.length ?? 0} reconnaissance(s) CATNAT`,
          `${risks.flood?.count ?? 0} zone(s) inondable(s) recensée(s)`,
        ],
        sourceKeys: ["georisques"],
        confidence: "medium",
        limitations: [
          "Risques naturels Géorisques ; distinct de la sécurité enregistrée SSMSI.",
        ],
      }),
    );
  }

  if (
    connectivity?.available &&
    connectivity.fiberEligibleSharePercent !== null &&
    connectivity.fiberEligibleSharePercent >= 70
  ) {
    facts.push(
      createFact({
        theme: "connectivity",
        target: "opportunities",
        sentence:
          "Valoriser la couverture numérique élevée pour l'attractivité résidentielle, le télétravail et les services en ligne.",
        evidence: [
          `${connectivity.fiberEligibleSharePercent} % des locaux raccordables à la fibre`,
        ],
        sourceKeys: ["arcep-fibre"],
        year: connectivity.vintage,
        confidence: "medium",
        limitations: [
          "Couverture fibre ARCEP ; ne mesure pas la qualité de service réelle ni les usages.",
        ],
      }),
    );
  }

  if (tourism?.available && tourism.accommodationPlaces > 0) {
    facts.push(
      createFact({
        theme: "tourism",
        target: "opportunities",
        sentence:
          "Articuler capacité d'hébergement, équipements et offre de services pour renforcer l'accueil touristique local.",
        evidence: [`${tourism.accommodationPlaces} places d'hébergement touristique`],
        sourceKeys: ["tourism-capacity"],
        year: tourism.year,
        confidence: "medium",
        limitations: [
          "Sans données de fréquentation, d'acteurs ou d'emplois touristiques ; ne pas parler de filière structurée.",
        ],
      }),
    );
  }

  if (
    education?.available &&
    education.totalOpen > 0 &&
    health?.available &&
    health.totalEstablishments > 0
  ) {
    facts.push(
      createFact({
        theme: "education",
        target: "opportunities",
        sentence:
          "S'appuyer sur l'offre éducative et sanitaire recensée pour renforcer l'attractivité et les services de proximité.",
        evidence: [
          `${education.totalOpen} établissement(s) scolaire(s) ouvert(s)`,
          `${health.totalEstablishments} établissement(s) sanitaires et sociaux`,
        ],
        sourceKeys: ["education-annuaire", "finess"],
        confidence: "medium",
        limitations: [
          "Offre institutionnelle recensée ; ne mesure pas la qualité ni l'accessibilité.",
        ],
      }),
    );
  }

  const lowPublicTransport =
    commute?.available &&
    commute.publicTransportSharePercent !== null &&
    commute.publicTransportSharePercent < 5;
  const hasIrve = irve?.available && irve.chargingPoints > 0;

  if (lowPublicTransport && hasIrve) {
    facts.push(
      createFact({
        theme: "mobility",
        target: "opportunities",
        sentence:
          "Développer la mobilité durable du quotidien (vélo, covoiturage, recharge électrique) en complément de l'usage automobile dominant.",
        evidence: [
          `${commute.publicTransportSharePercent} % des actifs en transport en commun`,
          `${irve.chargingPoints} point(s) de recharge IRVE`,
        ],
        sourceKeys: ["insee-commute", "irve"],
        confidence: "medium",
        limitations: [
          "Parts des déplacements domicile-travail (recensement) ; ne décrit pas l'offre réelle de transport collectif.",
        ],
      }),
    );
  } else if (lowPublicTransport) {
    facts.push(
      createFact({
        theme: "mobility",
        target: "opportunities",
        sentence:
          "Renforcer les alternatives à la voiture pour les déplacements du quotidien (modes actifs, mutualisation, combinaison de plusieurs modes de transport).",
        evidence: [
          `${commute.publicTransportSharePercent} % des actifs en transport en commun`,
        ],
        sourceKeys: ["insee-commute"],
        year: commute?.year,
        confidence: "medium",
        limitations: [
          "Parts des déplacements domicile-travail (recensement) ; ne conclut pas à une offre de transport limitée sans données d'offre.",
        ],
      }),
    );
  }

  if (urbanPolicy?.available && urbanPolicy.hasQpv && urbanPolicy.qpvCount > 0) {
    facts.push(
      createFact({
        theme: "policy_city",
        target: "opportunities",
        sentence:
          "Renforcer l'accès aux services publics et de proximité dans les quartiers prioritaires de la politique de la ville.",
        evidence: [`${urbanPolicy.qpvCount} quartier(s) prioritaire(s) recensé(s)`],
        sourceKeys: ["qpv"],
        year: urbanPolicy.year,
        confidence: "medium",
        limitations: [
          "Enjeux localisés QPV ; ne pas généraliser à toute la commune.",
        ],
      }),
    );
  }

  const proximity = territory.enrichment?.proximityServices;
  if (
    proximity?.available &&
    proximity.franceServicesCount > 0 &&
    !facts.some((f) => f.sourceKeys.includes("france-services"))
  ) {
    facts.push(
      createFact({
        theme: "public_services",
        target: "opportunities",
        sentence:
          "Consolider le rôle de France Services comme point d'accès aux démarches administratives de proximité.",
        evidence: [`${proximity.franceServicesCount} structure(s) France Services`],
        sourceKeys: ["france-services"],
        year: proximity.year,
        confidence: "medium",
        limitations: [
          "Structure France Services ; ne couvre pas l'ensemble des services publics.",
        ],
      }),
    );
  }

  return facts;
}
