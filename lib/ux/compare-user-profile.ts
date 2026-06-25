"use client";

import { useCallback, useSyncExternalStore } from "react";
import { COMPARE_PRIORITY_IDS } from "@/lib/compare/user-priorities";

const STORAGE_KEY = "territoire-portrait:compare-priorities";

let cachedRaw: string | null | undefined;
let cachedPriorities: string[] = [...COMPARE_PRIORITY_IDS];

const listeners = new Set<() => void>();

function parseStoredPriorities(raw: string | null): string[] {
  if (!raw) {
    return [...COMPARE_PRIORITY_IDS];
  }

  const ids = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => COMPARE_PRIORITY_IDS.includes(item));

  return ids.length > 0 ? ids : [...COMPARE_PRIORITY_IDS];
}

function readPrioritiesSnapshot(): string[] {
  if (typeof window === "undefined") {
    return [...COMPARE_PRIORITY_IDS];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedPriorities;
  }

  cachedRaw = raw;
  cachedPriorities = parseStoredPriorities(raw);
  return cachedPriorities;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) {
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

export function getComparePrioritiesServerSnapshot(): string[] {
  return [...COMPARE_PRIORITY_IDS];
}

export function saveComparePriorities(ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const valid = ids.filter((id) => COMPARE_PRIORITY_IDS.includes(id));
  const next = valid.length > 0 ? valid : [...COMPARE_PRIORITY_IDS];
  cachedRaw = next.join(",");
  cachedPriorities = next;
  window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  notifyListeners();
}

export function resolveComparePriorities(
  urlPriorities: string[],
  storedPriorities: string[],
): string[] {
  if (urlPriorities.length > 0) {
    return urlPriorities;
  }
  return storedPriorities;
}

export function useComparePriorities(input?: {
  urlPriorities?: string[];
}): {
  priorityIds: string[];
  setPriorityIds: (ids: string[]) => void;
} {
  const storedPriorities = useSyncExternalStore(
    subscribe,
    readPrioritiesSnapshot,
    getComparePrioritiesServerSnapshot,
  );

  const urlPriorities = input?.urlPriorities ?? [];
  const priorityIds = resolveComparePriorities(urlPriorities, storedPriorities);

  const setPriorityIds = useCallback((ids: string[]) => {
    const valid = ids.filter((id) => COMPARE_PRIORITY_IDS.includes(id));
    const next = valid.length > 0 ? valid : [...COMPARE_PRIORITY_IDS];
    cachedRaw = next.join(",");
    cachedPriorities = next;
    window.localStorage.setItem(STORAGE_KEY, cachedRaw);
    notifyListeners();
  }, []);

  return { priorityIds, setPriorityIds };
}
