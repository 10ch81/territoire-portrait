import { COMPARE_THEMATIC_PROFILES } from "@/lib/compare/profiles";
import {
  isValidInseeCode,
  normalizeInseeCode,
} from "@/lib/compare/parse-codes";
import { COMPARE_PRIORITY_IDS } from "@/lib/compare/user-priorities";

export const HABITAT_STORAGE_KEY = "territoire-portrait:habitat-profile";
export const MAX_HABITAT_PRIORITIES = 3;

export interface HabitatReferenceCommune {
  inseeCode: string;
  name: string;
}

export interface HabitatProfile {
  priorityIds: string[];
  referenceCommune: HabitatReferenceCommune | null;
}

/** @deprecated Alias rétrocompat — préférer HabitatProfile */
export type HabitatProfileAnswers = Pick<HabitatProfile, "priorityIds">;

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
    case "fiscalite":
      return "Charges fiscales locales";
    case "collectivite":
      return "Vie communale";
    case "implantation":
      return "Activité économique";
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
    case "fiscalite":
      return "Taxe foncière, dette et recettes (REI, OFGL).";
    case "collectivite":
      return "Dynamique, équipements, rang dans l'EPCI.";
    case "implantation":
      return "Entreprises, emploi salarié, connectivité.";
    default:
      return "";
  }
}

export function normalizeHabitatReferenceCommune(
  raw: unknown,
): HabitatReferenceCommune | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Partial<HabitatReferenceCommune>;
  if (typeof candidate.inseeCode !== "string" || typeof candidate.name !== "string") {
    return null;
  }

  const inseeCode = normalizeInseeCode(candidate.inseeCode);
  const name = candidate.name.trim();
  if (!isValidInseeCode(inseeCode) || name.length === 0) {
    return null;
  }

  return { inseeCode, name };
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

export function prioritiesFromHabitatProfile(profile: HabitatProfile): string[] {
  const validated = validateHabitatPriorities(profile.priorityIds);
  return validated.length > 0 ? validated : [...COMPARE_PRIORITY_IDS];
}

export function parseHabitatProfile(raw: string | null): HabitatProfile | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HabitatProfile>;
    const priorityIds = validateHabitatPriorities(
      Array.isArray(parsed.priorityIds) ? parsed.priorityIds : [],
    );
    const referenceCommune = normalizeHabitatReferenceCommune(parsed.referenceCommune);

    if (priorityIds.length === 0 && referenceCommune === null) {
      return null;
    }

    return { priorityIds, referenceCommune };
  } catch {
    return null;
  }
}

export function serializeHabitatProfile(profile: HabitatProfile): string {
  return JSON.stringify({
    priorityIds: validateHabitatPriorities(profile.priorityIds),
    ...(profile.referenceCommune
      ? { referenceCommune: profile.referenceCommune }
      : {}),
  });
}

export function readStoredHabitatProfile(): HabitatProfile {
  if (typeof window === "undefined") {
    return { priorityIds: [], referenceCommune: null };
  }

  return (
    parseHabitatProfile(window.localStorage.getItem(HABITAT_STORAGE_KEY)) ?? {
      priorityIds: [],
      referenceCommune: null,
    }
  );
}

export function saveHabitatProfile(profile: HabitatProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HABITAT_STORAGE_KEY, serializeHabitatProfile(profile));
}
