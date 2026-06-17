import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const CACHE_DIR = resolve(process.cwd(), "data/cache");

export function cachePath(filename: string): string {
  return resolve(CACHE_DIR, filename);
}

const cacheStore = new Map<string, unknown | null | undefined>();

export function isJsonCachePresent(filename: string): boolean {
  return existsSync(cachePath(filename));
}

export function loadJsonCache<T>(filename: string): T | null {
  if (cacheStore.has(filename)) {
    return cacheStore.get(filename) as T | null;
  }

  const path = cachePath(filename);

  if (!existsSync(path)) {
    cacheStore.set(filename, null);
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as T;
    cacheStore.set(filename, parsed);
    return parsed;
  } catch (error) {
    console.error(`Impossible de lire le cache ${filename}:`, error);
    cacheStore.set(filename, null);
    return null;
  }
}
