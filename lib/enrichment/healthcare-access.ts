import { departmentCodeFromInsee } from "../indicators/department-ranks";
import {
  APL_GENERAL_PRACTITIONER_NOTE,
  APL_VINTAGE,
} from "../apl";
import { createAplSource } from "../sources";
import type { AplCommuneCache, HealthcareAccessSnapshot } from "../types";
import { isJsonCachePresent, loadJsonCache } from "./cache";

const CACHE_FILE = "apl-by-commune.json";

function unavailableSnapshot(note: string): HealthcareAccessSnapshot {
  return {
    available: false,
    generalPractitioner: {
      year: APL_VINTAGE,
      value: 0,
      valueUnder65: null,
      departmentMedian: null,
      available: false,
      note,
    },
  };
}

export function loadHealthcareAccessSnapshot(
  inseeCode: string,
  departmentCode: string | undefined,
): HealthcareAccessSnapshot {
  if (!isJsonCachePresent(CACHE_FILE)) {
    return unavailableSnapshot(
      "Cache APL DREES absent. Exécutez « npm run ingest:apl » pour activer l'accessibilité aux soins de ville.",
    );
  }

  const cache = loadJsonCache<AplCommuneCache>(CACHE_FILE);
  const entry = cache?.communes[inseeCode];
  if (!entry) {
    return unavailableSnapshot(
      "Commune absente du millésime APL DREES (Mayotte non couverte ou code INSEE non diffusé).",
    );
  }

  const gp = entry.generalPractitioner;
  const depCode = departmentCode ?? departmentCodeFromInsee(inseeCode);
  const departmentMedian = cache.departmentMedians[depCode] ?? null;

  return {
    available: true,
    generalPractitioner: {
      year: gp.year,
      value: gp.value,
      valueUnder65: gp.valueUnder65,
      departmentMedian,
      available: true,
      note: APL_GENERAL_PRACTITIONER_NOTE,
    },
  };
}

export { createAplSource };
