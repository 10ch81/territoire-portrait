import { createCommuteSource, createArcepSource, createIrveSource, RP_VINTAGE } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type {
  ArcepCommuneCache,
  CommuteCommuneCache,
  CommuteSnapshot,
  ConnectivitySnapshot,
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
      year: RP_VINTAGE,
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
      year: RP_VINTAGE,
      employedCount: null,
      carSharePercent: null,
      publicTransportSharePercent: null,
      available: false,
      note: `Commune absente du cache mobilité domicile-travail (RP ${RP_VINTAGE}).`,
    };
  }

  return {
    year: entry.year,
    employedCount: entry.employedCount,
    carSharePercent: entry.carSharePercent,
    publicTransportSharePercent: entry.publicTransportSharePercent,
    available: true,
    note:
      `Recensement ${entry.year} — part des actifs occupés de 15 ans ou plus selon le mode de transport principal domicile-travail.`,
  };
}

function loadConnectivityPart(inseeCode: string): ConnectivitySnapshot {
  if (!isJsonCachePresent("arcep-by-commune.json")) {
    return {
      vintage: "last",
      fiberEligibleSharePercent: null,
      totalPremises: null,
      fiberEligiblePremises: null,
      technologies: [],
      available: false,
      note:
        "Cache ARCEP absent. Exécutez « npm run ingest:fibre » pour activer la couverture fibre.",
    };
  }

  const cache = loadJsonCache<ArcepCommuneCache>("arcep-by-commune.json");
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      vintage: "last",
      fiberEligibleSharePercent: null,
      totalPremises: null,
      fiberEligiblePremises: null,
      technologies: [],
      available: false,
      note: "Commune absente du cache ARCEP (Ma connexion internet).",
    };
  }

  return {
    vintage: entry.vintage,
    fiberEligibleSharePercent: entry.fiberEligibleSharePercent,
    totalPremises: entry.totalPremises,
    fiberEligiblePremises: entry.fiberEligiblePremises,
    technologies: entry.technologies,
    available: entry.totalPremises > 0,
    note:
      "ARCEP — part estimée de locaux raccordables fibre (agrégat IPE opérateurs vs stock locaux). Ne mesure pas la mobilité physique.",
  };
}

export function loadMobilitySnapshot(inseeCode: string): MobilitySnapshot {
  return {
    irve: loadIrvePart(inseeCode),
    commute: loadCommutePart(inseeCode),
    connectivity: loadConnectivityPart(inseeCode),
  };
}

export function isMobilityAvailable(snapshot: MobilitySnapshot): boolean {
  return (
    snapshot.irve.available ||
    snapshot.commute.available ||
    snapshot.connectivity.available
  );
}

export { createCommuteSource, createIrveSource, createArcepSource };
