import { createIrveSource } from "../sources";
import { loadJsonCache } from "./cache";
import type { IrveCommuneCache, IrveSnapshot } from "../types";

const IRVE_CACHE_FILE = "irve-by-commune.json";

export function loadIrveSnapshot(inseeCode: string): IrveSnapshot {
  const cache = loadJsonCache<IrveCommuneCache>(IRVE_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2026,
      chargingPoints: 0,
      stations: 0,
      available: false,
      note:
        "Cache IRVE absent. Exécutez « npm run ingest:irve » pour activer les bornes de recharge.",
    };
  }

  return {
    year: entry.year,
    chargingPoints: entry.chargingPoints,
    stations: entry.stations,
    available: true,
    note: "Fichier consolidé national IRVE (RAIDEN) — points de charge recensés par commune.",
  };
}

export { createIrveSource };
