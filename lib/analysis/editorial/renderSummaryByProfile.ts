import type { TerritoryProfile } from "../../types";
import { resolveDisplayTypologyLabel } from "../context/displayTypologyLabel";
import { buildDeterministicSummary } from "../build-canonical-output";
import type { AnalysisFact, AnalysisFactTheme } from "../types";
import { buildStrengthSummaryPhrase } from "../strength-summary-fragments";
import { qualifiesForAttractiveUrbanOpening } from "../strength-signals";
import type { EditorialProfile, EditorialProfileId } from "./editorialProfiles";
import {
  formatVigilanceOnIssues,
  shouldAppendTypologyHint,
} from "./editorialPolish";

function selectedThemes(facts: AnalysisFact[]): Set<AnalysisFactTheme> {
  return new Set(facts.map((fact) => fact.theme));
}

function hasTheme(facts: AnalysisFact[], theme: AnalysisFactTheme): boolean {
  return facts.some((fact) => fact.theme === theme);
}

function watchIssueLabels(facts: AnalysisFact[], max = 3): string[] {
  const labels: string[] = [];
  for (const fact of facts.filter((f) => f.target === "watchPoints")) {
    const label = fact.summaryIssueAfterA?.trim();
    if (label) labels.push(label);
    if (labels.length >= max) break;
  }
  return labels;
}

function fallbackOpeningClause(
  profileId: EditorialProfileId,
  territory: TerritoryProfile,
): string {
  const name = territory.name || "La commune";
  const epci = territory.epci?.name;

  switch (profileId) {
    case "largeUrbanCenter":
      return epci
        ? `${name} constitue une centralité majeure de ${epci}`
        : `${name} présente un profil de grande centralité urbaine`;
    case "growthEpciCentrality":
      return epci
        ? `${name} combine une forte croissance démographique et un rang élevé dans ${epci}`
        : `${name} combine croissance démographique et centralité intercommunale`;
    case "mountainTourismCenter":
      return `${name} présente un profil de ville-centre de montagne à forte vocation touristique`;
    case "smallPeriurbanGrowth":
      return `${name} se distingue comme petite commune en développement au sein de son territoire intercommunal`;
    case "employmentPole":
      return `${name} s'appuie sur une base d'emploi significative pour sa taille`;
    case "ruralDecline":
      return `${name} présente un profil rural avec une trajectoire démographique contrastée`;
    case "socialFragilityUrban":
      return `${name} cumule des atouts urbains et des fragilités sociales localisées`;
    default:
      return `${name} présente un profil territorial documenté dans les sources consultées`;
  }
}

function openingClause(
  profileId: EditorialProfileId,
  territory: TerritoryProfile,
): string {
  const name = territory.name || "La commune";
  if (qualifiesForAttractiveUrbanOpening(territory)) {
    return `${name} présente un profil de ville-centre attractive et bien équipée`;
  }
  return fallbackOpeningClause(profileId, territory);
}

function vigilanceClause(profileId: EditorialProfileId, facts: AnalysisFact[]): string {
  const issues = watchIssueLabels(facts);
  if (issues.length > 0) {
    return formatVigilanceOnIssues(issues);
  }

  const watchThemes = selectedThemes(facts.filter((f) => f.target === "watchPoints"));

  switch (profileId) {
    case "largeUrbanCenter":
      if (hasTheme(facts, "employment") && hasTheme(facts, "policy_city")) {
        return "La synthèse fait ressortir des enjeux sociaux et urbains liés à l'emploi et aux quartiers prioritaires.";
      }
      return "La synthèse met en évidence des enjeux de sécurité, de finances ou de politique de la ville à suivre.";
    case "growthEpciCentrality":
      return "Les points de vigilance portent davantage sur certains risques naturels et indicateurs de sécurité à interpréter avec prudence.";
    case "mountainTourismCenter":
      return "Les enjeux portent sur les risques naturels, l'équilibre entre population résidente et fréquentation touristique, et la trajectoire financière locale.";
    case "smallPeriurbanGrowth":
      return "La prudence méthodologique sur la sécurité et les risques naturels reste centrale compte tenu des effectifs statistiques.";
    default:
      if (watchThemes.size === 0) {
        return "Aucun point de vigilance majeur ne ressort au-delà des limites de données.";
      }
      return "La synthèse identifie plusieurs sujets à approfondir dans les thématiques documentées.";
  }
}

export function renderSummaryByProfile(
  territory: TerritoryProfile,
  profile: EditorialProfile,
  selectedFacts: AnalysisFact[],
): string {
  const opening = openingClause(profile.id, territory);
  const assets = buildStrengthSummaryPhrase(selectedFacts);
  const vigilance = vigilanceClause(profile.id, selectedFacts);

  const typology = resolveDisplayTypologyLabel(territory);
  const typologyHint =
    typology && shouldAppendTypologyHint(opening, typology) ? ` (${typology})` : "";

  let phrase1: string;
  if (qualifiesForAttractiveUrbanOpening(territory)) {
    phrase1 = `${opening}, avec ${assets}.`;
  } else if (profile.id === "growthEpciCentrality") {
    phrase1 = `${opening}${typologyHint}, complétée par ${assets}.`;
  } else {
    phrase1 = `${opening}${typologyHint}, avec ${assets}.`;
  }

  const phrase2 = vigilance;

  return `${phrase1} ${phrase2}`.replace(/\s+/g, " ").trim();
}

export function renderSummaryByProfileWithFallback(
  territory: TerritoryProfile,
  profile: EditorialProfile,
  selectedFacts: AnalysisFact[],
): string {
  const rendered = renderSummaryByProfile(territory, profile, selectedFacts);
  if (rendered.length < 80) {
    return buildDeterministicSummary(territory, selectedFacts);
  }
  return rendered;
}
