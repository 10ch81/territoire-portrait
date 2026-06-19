import { renderFactSentenceForOutput } from "../progressive-qualification";
import type { AnalysisFact, AnalysisFactTheme } from "../types";
import type { EditorialProfile, EditorialProfileId } from "./editorialProfiles";
import { guardEditorialOpportunity } from "./editorialQualityGuards";

type OpportunityTemplate = {
  profileIds: EditorialProfileId[];
  strengthThemes: AnalysisFactTheme[];
  watchThemes: AnalysisFactTheme[];
  render: () => string;
};

const OPPORTUNITY_TEMPLATES: OpportunityTemplate[] = [
  {
    profileIds: ["growthEpciCentrality"],
    strengthThemes: ["centrality", "demography", "employment_sectors"],
    watchThemes: ["risks", "security", "housing"],
    render: () =>
      "Accompagner la croissance démographique par une analyse des besoins en équipements et services, en s'appuyant sur la base d'emploi et le rang de centralité dans l'EPCI, tout en suivant les risques naturels et indicateurs de sécurité avec prudence.",
  },
  {
    profileIds: ["largeUrbanCenter", "socialFragilityUrban"],
    strengthThemes: ["employment_sectors", "economy", "equipments"],
    watchThemes: ["employment", "policy_city", "security"],
    render: () =>
      "Articuler les politiques d'insertion, d'emploi et de proximité dans les quartiers prioritaires, compte tenu du chômage observé et du poids de la base économique locale.",
  },
  {
    profileIds: ["mountainTourismCenter"],
    strengthThemes: ["tourism", "employment_sectors", "equipments"],
    watchThemes: ["risks", "housing", "finances", "demography"],
    render: () =>
      "Croiser tourisme, logement, mobilité et risques naturels pour objectiver les tensions liées à la population présente et aux investissements locaux, sans extrapoler au-delà des données de fréquentation disponibles.",
  },
  {
    profileIds: ["smallPeriurbanGrowth"],
    strengthThemes: ["centrality", "demography", "connectivity"],
    watchThemes: ["security", "risks"],
    render: () =>
      "Consolider l'attractivité résidentielle par un suivi des besoins de proximité et des équipements, en croisant dynamique démographique, centralité locale et prudence méthodologique sur la sécurité.",
  },
  {
    profileIds: ["employmentPole"],
    strengthThemes: ["employment_sectors", "economy"],
    watchThemes: ["employment", "mobility"],
    render: () =>
      "Renforcer l'articulation entre base d'emploi locale et accessibilité des services, en croisant données d'emploi salarié et points de vigilance documentés.",
  },
  {
    profileIds: ["ruralDecline", "genericCentralite"],
    strengthThemes: ["centrality", "equipments", "public_services"],
    watchThemes: ["demography", "ageing", "finances", "risks"],
    render: () =>
      "Prioriser un diagnostic ciblé sur les fragilités démographiques et financières documentées, plutôt qu'une mobilisation générique d'acteurs ou de filières peu ancrées localement.",
  },
];

function hasThemes(facts: AnalysisFact[], themes: AnalysisFactTheme[]): boolean {
  return themes.some((theme) => facts.some((fact) => fact.theme === theme));
}

function matchesTemplate(
  template: OpportunityTemplate,
  profileId: EditorialProfileId,
  strengths: AnalysisFact[],
  watchPoints: AnalysisFact[],
): boolean {
  if (!template.profileIds.includes(profileId)) {
    return false;
  }
  return (
    hasThemes(strengths, template.strengthThemes) &&
    hasThemes(watchPoints, template.watchThemes)
  );
}

export function renderOpportunityByProfile(
  profile: EditorialProfile,
  selectedFacts: AnalysisFact[],
): string[] {
  const mvpOpportunities = selectedFacts
    .filter((fact) => fact.target === "opportunities")
    .map((fact) => renderFactSentenceForOutput(fact));

  const strengths = selectedFacts.filter((fact) => fact.target === "strengths");
  const watchPoints = selectedFacts.filter((fact) => fact.target === "watchPoints");

  const template = OPPORTUNITY_TEMPLATES.find((candidate) =>
    matchesTemplate(candidate, profile.id, strengths, watchPoints),
  );

  if (!template) {
    return mvpOpportunities;
  }

  return mvpOpportunities.map((fallback, index) => {
    if (index > 0) {
      return fallback;
    }
    return guardEditorialOpportunity(template.render(), fallback, selectedFacts);
  });
}
