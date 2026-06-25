import { COMPARE_THEMATIC_PROFILES } from "@/lib/compare/profiles";
import { COMPARE_PRIORITY_IDS } from "@/lib/compare/user-priorities";

export const HABITAT_STORAGE_KEY = "territoire-portrait:habitat-profile";
export const MAX_HABITAT_PRIORITIES = 3;

export interface HabitatProfileAnswers {
  priorityIds: string[];
}

export interface HabitatProfileOption {
  id: string;
  label: string;
  hint: string;
}

export const HABITAT_PROFILE_OPTIONS: HabitatProfileOption[] = COMPARE_THEMATIC_PROFILES.map(
  (profile) => ({
    id: profile.id,
    label: profileLabelForHabitat(profile.id, profile.label),
    hint: profileHintForHabitat(profile.id),
  }),
);

function profileLabelForHabitat(id: string, fallback: string): string {
  switch (id) {
    case "familial":
      return "Vie de famille";
    case "logement":
      return "Accessibilité au logement";
    case "revenus":
      return "Niveau de vie";
    case "equipee":
      return "Services de proximité";
    case "mobile":
      return "Transports et connectivité";
    case "dynamique":
      return "Dynamisme local";
    case "dense":
      return "Cadre urbain";
    default:
      return fallback;
  }
}

function profileHintForHabitat(id: string): string {
  switch (id) {
    case "familial":
      return "Jeunesse, scolarité, IPS moyen.";
    case "logement":
      return "Prix au m², vacance, résidences secondaires.";
    case "revenus":
      return "Revenus médians, emploi, précarité.";
    case "equipee":
      return "Commerces, santé, France Services.";
    case "mobile":
      return "Transports en commun, fibre.";
    case "dynamique":
      return "Population, entreprises, emploi salarié.";
    case "dense":
      return "Densité, urbanité.";
    default:
      return "";
  }
}

export function validateHabitatPriorities(rawIds: string[]): string[] {
  const seen = new Set<string>();
  const valid: string[] = [];

  for (const id of rawIds) {
    if (!COMPARE_PRIORITY_IDS.includes(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    valid.push(id);
    if (valid.length >= MAX_HABITAT_PRIORITIES) {
      break;
    }
  }

  return valid;
}

export function prioritiesFromHabitatProfile(answers: HabitatProfileAnswers): string[] {
  const validated = validateHabitatPriorities(answers.priorityIds);
  return validated.length > 0 ? validated : [...COMPARE_PRIORITY_IDS];
}

export function parseHabitatProfile(raw: string | null): HabitatProfileAnswers | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as HabitatProfileAnswers;
    if (!Array.isArray(parsed.priorityIds)) {
      return null;
    }
    const priorityIds = validateHabitatPriorities(parsed.priorityIds);
    if (priorityIds.length === 0) {
      return null;
    }
    return { priorityIds };
  } catch {
    return null;
  }
}

export function serializeHabitatProfile(answers: HabitatProfileAnswers): string {
  return JSON.stringify({
    priorityIds: validateHabitatPriorities(answers.priorityIds),
  });
}
