"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  COLLECTIVITY_STORAGE_KEY,
  type CollectivityProfile,
  parseCollectivityProfile,
  serializeCollectivityProfile,
} from "./collectivity-profile";
import type { HabitatReferenceCommune } from "./habitat-profile";
import { loadRecentCommunes } from "./recent-communes";

const EMPTY: CollectivityProfile = { referenceCommune: null };

let cachedRaw: string | null | undefined;
let cachedProfile: CollectivityProfile = EMPTY;
const listeners = new Set<() => void>();

function readSnapshot(): CollectivityProfile {
  if (typeof window === "undefined") {
    return EMPTY;
  }
  const raw = window.localStorage.getItem(COLLECTIVITY_STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedProfile;
  }
  cachedRaw = raw;
  const parsed = parseCollectivityProfile(raw);
  if (parsed) {
    cachedProfile = parsed;
    return parsed;
  }
  const recent = loadRecentCommunes()[0];
  cachedProfile = recent
    ? { referenceCommune: { inseeCode: recent.inseeCode, name: recent.name } }
    : EMPTY;
  return cachedProfile;
}

export function useCollectivityProfileState(): {
  profile: CollectivityProfile;
  setReferenceCommune: (commune: HabitatReferenceCommune) => void;
  persistProfile: (profile: CollectivityProfile) => void;
} {
  const profile = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    readSnapshot,
    () => EMPTY,
  );

  const setReferenceCommune = useCallback((commune: HabitatReferenceCommune) => {
    const next = { ...readSnapshot(), referenceCommune: commune };
    cachedRaw = serializeCollectivityProfile(next);
    cachedProfile = next;
    window.localStorage.setItem(COLLECTIVITY_STORAGE_KEY, cachedRaw);
    for (const listener of listeners) {
      listener();
    }
  }, []);

  const persistProfile = useCallback((next: CollectivityProfile) => {
    cachedRaw = serializeCollectivityProfile(next);
    cachedProfile = next;
    window.localStorage.setItem(COLLECTIVITY_STORAGE_KEY, cachedRaw);
    for (const listener of listeners) {
      listener();
    }
  }, []);

  return { profile, setReferenceCommune, persistProfile };
}
