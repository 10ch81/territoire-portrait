"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "territoire-portrait:hide-sensitive-indicators";
const DEFAULT_HIDE = true;

let cachedRaw: string | null | undefined;
let cachedHide = DEFAULT_HIDE;

const listeners = new Set<() => void>();

function readHideSnapshot(): boolean {
  if (typeof window === "undefined") {
    return DEFAULT_HIDE;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedHide;
  }
  cachedRaw = raw;
  if (raw === null) {
    cachedHide = DEFAULT_HIDE;
    return cachedHide;
  }
  cachedHide = raw === "true";
  return cachedHide;
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

export function getHideSensitiveServerSnapshot(): boolean {
  return DEFAULT_HIDE;
}

export function useHideSensitiveIndicators(): {
  hideSensitive: boolean;
  setHideSensitive: (value: boolean) => void;
} {
  const hideSensitive = useSyncExternalStore(
    subscribe,
    readHideSnapshot,
    getHideSensitiveServerSnapshot,
  );

  const setHideSensitive = useCallback((value: boolean) => {
    cachedRaw = String(value);
    cachedHide = value;
    window.localStorage.setItem(STORAGE_KEY, String(value));
    notifyListeners();
  }, []);

  return { hideSensitive, setHideSensitive };
}
