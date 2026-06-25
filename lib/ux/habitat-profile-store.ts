"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  HABITAT_STORAGE_KEY,
  parseHabitatProfile,
  saveHabitatProfile,
  serializeHabitatProfile,
  type HabitatProfile,
  type HabitatReferenceCommune,
} from "./habitat-profile";
import { loadRecentCommunes } from "./recent-communes";

const EMPTY_PROFILE: HabitatProfile = {
  priorityIds: [],
  referenceCommune: null,
};

let cachedRaw: string | null | undefined;
let cachedProfile: HabitatProfile = EMPTY_PROFILE;

const listeners = new Set<() => void>();

function resolveInitialReference(
  storedReference: HabitatReferenceCommune | null,
): HabitatReferenceCommune | null {
  if (storedReference) {
    return storedReference;
  }

  const recent = loadRecentCommunes()[0];
  if (!recent) {
    return null;
  }

  return {
    inseeCode: recent.inseeCode,
    name: recent.name,
  };
}

function readHabitatProfileSnapshot(): HabitatProfile {
  if (typeof window === "undefined") {
    return EMPTY_PROFILE;
  }

  const raw = window.localStorage.getItem(HABITAT_STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedProfile;
  }

  cachedRaw = raw;
  const parsed = parseHabitatProfile(raw);
  cachedProfile = parsed
    ? {
        priorityIds: parsed.priorityIds,
        referenceCommune: resolveInitialReference(parsed.referenceCommune),
      }
    : {
        priorityIds: [],
        referenceCommune: resolveInitialReference(null),
      };

  return cachedProfile;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== HABITAT_STORAGE_KEY && event.key !== null) {
      return;
    }
    cachedRaw = undefined;
    onStoreChange();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getHabitatProfileServerSnapshot(): HabitatProfile {
  return EMPTY_PROFILE;
}

export function useHabitatProfileState(): {
  profile: HabitatProfile;
  setReferenceCommune: (commune: HabitatReferenceCommune) => void;
  setPriorityIds: (ids: string[]) => void;
  persistProfile: (profile: HabitatProfile) => void;
} {
  const profile = useSyncExternalStore(
    subscribe,
    readHabitatProfileSnapshot,
    getHabitatProfileServerSnapshot,
  );

  const setReferenceCommune = useCallback((commune: HabitatReferenceCommune) => {
    const next: HabitatProfile = {
      ...readHabitatProfileSnapshot(),
      referenceCommune: commune,
    };
    cachedRaw = serializeHabitatProfile(next);
    cachedProfile = next;
    saveHabitatProfile(next);
    notifyListeners();
  }, []);

  const setPriorityIds = useCallback((priorityIds: string[]) => {
    const next: HabitatProfile = {
      ...readHabitatProfileSnapshot(),
      priorityIds,
    };
    cachedRaw = serializeHabitatProfile(next);
    cachedProfile = next;
    saveHabitatProfile(next);
    notifyListeners();
  }, []);

  const persistProfile = useCallback((next: HabitatProfile) => {
    cachedRaw = serializeHabitatProfile(next);
    cachedProfile = next;
    saveHabitatProfile(next);
    notifyListeners();
  }, []);

  return { profile, setReferenceCommune, setPriorityIds, persistProfile };
}
