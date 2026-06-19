import type { TerritoryProfile } from "../../types";
import { renderFactSentenceForOutput } from "../progressive-qualification";
import type { AnalysisFact, AnalysisFactTheme } from "../types";
import type { EditorialProfile, EditorialProfileId } from "./editorialProfiles";
import { guardEditorialStrength } from "./editorialQualityGuards";

type StrengthTemplate = {
  profileIds: EditorialProfileId[];
  theme: AnalysisFactTheme;
  render: (fact: AnalysisFact, territory: TerritoryProfile) => string;
};

const STRENGTH_TEMPLATES: StrengthTemplate[] = [
  {
    profileIds: ["largeUrbanCenter"],
    theme: "equipments",
    render: () =>
      "L'offre d'équipements est dense, cohérente avec le rôle de ville-centre métropolitaine.",
  },
  {
    profileIds: ["largeUrbanCenter"],
    theme: "employment_sectors",
    render: (fact) => {
      const match = fact.sentence.match(/([\d\s]+)\s+postes salariés/i);
      if (match) {
        return `La commune dispose d'une base d'emploi importante (${match[1]!.trim()} postes salariés), cohérente avec son statut de centralité urbaine.`;
      }
      return "La commune dispose d'une base d'emploi importante, cohérente avec son statut de centralité urbaine.";
    },
  },
  {
    profileIds: ["growthEpciCentrality"],
    theme: "equipments",
    render: () =>
      "L'offre d'équipements est cohérente avec le rôle de centralité locale et la croissance démographique observée.",
  },
  {
    profileIds: ["growthEpciCentrality"],
    theme: "centrality",
    render: () =>
      "La commune occupe un rang élevé dans son EPCI, renforçant son rôle de centralité locale.",
  },
  {
    profileIds: ["growthEpciCentrality", "employmentPole"],
    theme: "employment_sectors",
    render: () =>
      "La commune présente une base d'emploi significative au regard de sa population, renforçant son rôle de centralité locale.",
  },
  {
    profileIds: ["mountainTourismCenter"],
    theme: "tourism",
    render: (fact) => {
      const match = fact.sentence.match(/([\d\s]+)\s+places/i);
      if (match) {
        return `La capacité d'hébergement touristique (${match[1]!.trim()} places) confirme la fonction touristique structurante de la commune, à interpréter avec l'absence de données de fréquentation.`;
      }
      return "La capacité d'hébergement touristique confirme la fonction touristique structurante de la commune, à interpréter avec l'absence de données de fréquentation.";
    },
  },
  {
    profileIds: ["mountainTourismCenter"],
    theme: "employment_sectors",
    render: () =>
      "La base d'emploi salarié reste importante au regard de la population résidente, au-delà de la seule fonction touristique.",
  },
  {
    profileIds: ["mountainTourismCenter"],
    theme: "equipments",
    render: () =>
      "L'offre d'équipements est très dense au regard de la population résidente, à interpréter avec prudence compte tenu de la fréquentation touristique.",
  },
  {
    profileIds: ["smallPeriurbanGrowth"],
    theme: "centrality",
    render: () =>
      "La commune affiche une centralité locale notable au sein de son territoire intercommunal.",
  },
  {
    profileIds: ["smallPeriurbanGrowth"],
    theme: "connectivity",
    render: () =>
      "La couverture numérique documentée soutient le développement de cette commune périurbaine.",
  },
  {
    profileIds: ["smallPeriurbanGrowth", "growthEpciCentrality"],
    theme: "demography",
    render: () =>
      "La dynamique démographique observée confirme l'attractivité résidentielle de la commune.",
  },
];

function findStrengthTemplate(
  profileId: EditorialProfileId,
  theme: AnalysisFactTheme,
): StrengthTemplate | undefined {
  return STRENGTH_TEMPLATES.find(
    (template) => template.profileIds.includes(profileId) && template.theme === theme,
  );
}

export function renderStrengthByProfile(
  fact: AnalysisFact,
  territory: TerritoryProfile,
  profile: EditorialProfile,
): string {
  const fallback = renderFactSentenceForOutput(fact);
  const template = findStrengthTemplate(profile.id, fact.theme);
  if (!template) {
    return fallback;
  }

  const rendered = template.render(fact, territory);

  return guardEditorialStrength(rendered, fallback, fact, profile);
}

export function renderStrengthsByProfile(
  facts: AnalysisFact[],
  territory: TerritoryProfile,
  profile: EditorialProfile,
): string[] {
  return facts
    .filter((fact) => fact.target === "strengths")
    .map((fact) => renderStrengthByProfile(fact, territory, profile));
}
