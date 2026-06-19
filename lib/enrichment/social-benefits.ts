import { createCafSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type { CafCommuneCache, SocialBenefitsSnapshot } from "../types";

const CACHE_FILE = "caf-by-commune.json";

const METHOD_NOTE =
  "Part des allocataires du RSA (CAF) parmi les ménages — indicateur territorial CNAF ; seul agrégat CAF disponible en bulk communal ≤ 20 Mo ; ne couvre pas l'ensemble des prestations (AAH, prime d'activité, aides logement, etc.).";

export function loadSocialBenefitsSnapshot(
  inseeCode: string,
): SocialBenefitsSnapshot {
  if (!isJsonCachePresent(CACHE_FILE)) {
    return {
      rsaVintage: null,
      rsaShareAmongHouseholdsPercent: null,
      available: false,
      note:
        "Cache CNAF absent. Exécutez « npm run ingest:caf » pour activer les indicateurs de prestations sociales.",
    };
  }

  const cache = loadJsonCache<CafCommuneCache>(CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry || entry.rsaShareAmongHouseholdsPercent === null) {
    return {
      rsaVintage: entry?.vintage ?? null,
      rsaShareAmongHouseholdsPercent: null,
      available: false,
      note: entry
        ? "Part RSA parmi les ménages non diffusée pour cette commune (secret statistique ou donnée absente)."
        : "Commune absente du cache CNAF (indicateurs territoriaux de précarité).",
    };
  }

  return {
    rsaVintage: entry.vintage,
    rsaShareAmongHouseholdsPercent: entry.rsaShareAmongHouseholdsPercent,
    available: true,
    note: METHOD_NOTE,
  };
}

export { createCafSource };
