import { OT_TERRITORIAL_ACCESS_DATASET_URL, createObservatoireAccessSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type {
  ObservatoireAccessCommuneCache,
  TerritorialAccessSnapshot,
} from "../types";

const CACHE_FILE = "observatoire-access-by-commune.json";

const HEALTH_NOTE =
  "Part de la population pour laquelle au moins un des 5 services de santé de proximité (pharmacie, médecin généraliste, masseur-kinésithérapeute, chirurgien-dentiste, infirmier) est à plus de 20 minutes en voiture (INSEE BPE, distancier Metric-OSRM, Observatoire des territoires).";

const CENTRALITY_NOTE =
  "Temps de trajet routier moyen vers le centre d'équipements et de services le plus proche (polarités intermédiaires et au-delà, typologie ANCT/INRAE). Temps théoriques en voiture ; hexagone métropolitain.";

const CACHE_ABSENT_NOTE =
  "Cache Observatoire des territoires absent. Exécutez « npm run ingest:observatoire-access ».";

const CENTRALITY_EXPORT_UNAVAILABLE_NOTE =
  "Export Observatoire des territoires indisponible pour le temps d'accès aux centralités (API Géoclip en erreur).";

function emptySnapshot(note: string): TerritorialAccessSnapshot {
  return {
    health: {
      distantSharePercent: null,
      year: null,
      available: false,
      note,
    },
    centrality: {
      accessMinutes: null,
      year: null,
      available: false,
      note: note === CACHE_ABSENT_NOTE ? note : CENTRALITY_EXPORT_UNAVAILABLE_NOTE,
    },
    available: false,
  };
}

export function loadTerritorialAccessSnapshot(
  inseeCode: string,
): TerritorialAccessSnapshot {
  if (!isJsonCachePresent(CACHE_FILE)) {
    return emptySnapshot(CACHE_ABSENT_NOTE);
  }

  const cache = loadJsonCache<ObservatoireAccessCommuneCache>(CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return emptySnapshot(
      `Commune absente du cache Observatoire des territoires (${OT_TERRITORIAL_ACCESS_DATASET_URL}).`,
    );
  }

  const healthAvailable = entry.healthDistantSharePercent !== null;
  const centralityAvailable = entry.centralityAccessMinutes !== null;

  return {
    health: {
      distantSharePercent: entry.healthDistantSharePercent,
      year: entry.healthVintage,
      available: healthAvailable,
      note: healthAvailable
        ? HEALTH_NOTE
        : "Part de population éloignée des soins de proximité (> 20 min) non diffusée pour cette commune.",
    },
    centrality: {
      accessMinutes: entry.centralityAccessMinutes,
      year: entry.centralityVintage,
      available: centralityAvailable,
      note: centralityAvailable
        ? CENTRALITY_NOTE
        : CENTRALITY_EXPORT_UNAVAILABLE_NOTE,
    },
    available: healthAvailable || centralityAvailable,
  };
}

export { createObservatoireAccessSource };
