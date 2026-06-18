import {
  createCommuteSource,
  createGtfsSource,
  createIrveSource,
} from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type {
  CommuteCommuneCache,
  CommuteSnapshot,
  IrveSnapshot,
  MobilitySnapshot,
  PublicTransportCommuneCache,
  PublicTransportSnapshot,
} from "../types";

const IRVE_CACHE_FILE = "irve-by-commune.json";
const COMMUTE_CACHE_FILE = "commute-by-commune.json";
const PUBLIC_TRANSPORT_CACHE_FILE = "public-transport-by-commune.json";

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

function loadPublicTransportPart(inseeCode: string): PublicTransportSnapshot {
  if (!isJsonCachePresent(PUBLIC_TRANSPORT_CACHE_FILE)) {
    return {
      year: 2026,
      stopCount: 0,
      feedCount: 0,
      available: false,
      note:
        "Cache GTFS absent. Exécutez « npm run ingest:gtfs » pour activer l'offre de transport collectif.",
    };
  }

  const cache = loadJsonCache<PublicTransportCommuneCache>(PUBLIC_TRANSPORT_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry || entry.stopCount === 0) {
    return {
      year: 2026,
      stopCount: 0,
      feedCount: entry?.feedCount ?? 0,
      available: entry !== undefined,
      note:
        entry === undefined
          ? "Aucun arrêt GTFS recensé sur la commune dans les flux transport.data.gouv.fr analysés."
          : "Arrêts GTFS agrégés par commune (transport.data.gouv.fr) ; hors horaires et fréquences.",
    };
  }

  return {
    year: entry.year,
    stopCount: entry.stopCount,
    feedCount: entry.feedCount,
    available: true,
    note:
      "Arrêts GTFS agrégés par commune (transport.data.gouv.fr) ; complète la BPE sans remplacer les horaires.",
  };
}

export function loadMobilitySnapshot(inseeCode: string): MobilitySnapshot {
  return {
    irve: loadIrvePart(inseeCode),
    commute: loadCommutePart(inseeCode),
    publicTransport: loadPublicTransportPart(inseeCode),
  };
}

export function isMobilityAvailable(snapshot: MobilitySnapshot): boolean {
  return (
    snapshot.irve.available ||
    snapshot.commute.available ||
    snapshot.publicTransport.available
  );
}

export { createCommuteSource, createGtfsSource, createIrveSource };
