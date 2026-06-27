import type { HabitatReferenceCommune } from "./habitat-profile";

export const COLLECTIVITY_STORAGE_KEY = "territoire-portrait:collectivity-profile";

export const COLLECTIVITY_DEFAULT_PRIORITIES = ["collectivite", "fiscalite"] as const;

export interface CollectivityProfile {
  referenceCommune: HabitatReferenceCommune | null;
}

export function parseCollectivityProfile(raw: string | null): CollectivityProfile | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CollectivityProfile>;
    const referenceCommune = parsed.referenceCommune;
    if (
      !referenceCommune ||
      typeof referenceCommune.inseeCode !== "string" ||
      typeof referenceCommune.name !== "string"
    ) {
      return null;
    }
    return { referenceCommune };
  } catch {
    return null;
  }
}

export function serializeCollectivityProfile(profile: CollectivityProfile): string {
  return JSON.stringify(profile);
}
