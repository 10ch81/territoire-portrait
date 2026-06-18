import { createCommuteSource, createIrveSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type {
  CommuteCommuneCache,
  CommuteSnapshot,
  IrveSnapshot,
  MobilitySnapshot,
} from "../types";

const IRVE_CACHE_FILE = "irve-by-commune.json";
const COMMUTE_CACHE_FILE = "commute-by-commune.json";

function loadIrvePart(inseeCode: string): IrveSnapshot {
  if (!isJsonCachePresent(IRVE_CACHE_FILE)) {
    return {
      year: 2026,
      chargingPoints: 0,
      stations: 0,
      available: false,
      note:
        "Cache IRVE absent. Exécutez « npm run ingest:irve » pour activer les bornes de recharge.",
    };
  }

  const cache = loadJsonCache<Record<string, { year: number; chargingPoints: number; stations: number }>>(
    IRVE_CACHE_FILE,
  ) ?? {};
  const entry = cache[inseeCode];

  if (!entry) {
    return {
      year: 2026,
      chargingPoints: 0,
      stations: 0,
      available: true,
      note:
        "Aucune borne de recharge recensée sur la commune dans le fichier national IRVE.",
    };
  }

  return {
    year: entry.year,
    chargingPoints: entry.chargingPoints,
    stations: entry.stations,
    available: true,
    note: "Fichier consolidé national IRVE — points de charge recensés par commune.",
  };
}

function loadCommutePart(inseeCode: string): CommuteSnapshot {
  if (!isJsonCachePresent(COMMUTE_CACHE_FILE)) {
    return {
      year: 2021,
      employedCount: null,
      carSharePercent: null,
      publicTransportSharePercent: null,
      available: false,
      note:
        "Cache mobilité domicile-travail absent. Exécutez « npm run ingest:commute ».",
    };
  }

  const cache = loadJsonCache<CommuteCommuneCache>(COMMUTE_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2021,
      employedCount: null,
      carSharePercent: null,
      publicTransportSharePercent: null,
      available: false,
      note: "Commune absente du cache mobilité domicile-travail (RP 2021).",
    };
  }

  return {
    year: entry.year,
    employedCount: entry.employedCount,
    carSharePercent: entry.carSharePercent,
    publicTransportSharePercent: entry.publicTransportSharePercent,
    available: true,
    note:
      "Recensement 2021 — part des actifs occupés de 15 ans ou plus selon le mode de transport principal domicile-travail.",
  };
}

export function loadMobilitySnapshot(inseeCode: string): MobilitySnapshot {
  return {
    irve: loadIrvePart(inseeCode),
    commute: loadCommutePart(inseeCode),
  };
}

export function isMobilityAvailable(snapshot: MobilitySnapshot): boolean {
  return snapshot.irve.available || snapshot.commute.available;
}

export { createCommuteSource, createIrveSource };
