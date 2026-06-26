import { departmentCodeFromInsee } from "../indicators/department-code";
import {
  APL_DENTIST_NOTE,
  APL_GENERAL_PRACTITIONER_NOTE,
  APL_NURSE_NOTE,
  APL_PHYSIOTHERAPIST_NOTE,
  APL_VINTAGE,
} from "../apl";
import { createAplSource } from "../sources";
import type {
  AplCommuneCache,
  AplCommuneCacheEntry,
  AplEtpSnapshot,
  AplEtpValues,
  HealthcareAccessSnapshot,
} from "../types";
import { isJsonCachePresent, loadJsonCache } from "./cache";

const CACHE_FILE = "apl-by-commune.json";

function unavailableEtpSnapshot(note: string): AplEtpSnapshot {
  return {
    year: APL_VINTAGE,
    value: 0,
    departmentMedian: null,
    available: false,
    note,
  };
}

function unavailableSnapshot(note: string): HealthcareAccessSnapshot {
  const etpUnavailable = unavailableEtpSnapshot(note);
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
    nurse: etpUnavailable,
    physiotherapist: etpUnavailable,
    dentist: etpUnavailable,
  };
}

function isLegacyAplCache(cache: AplCommuneCache | null): cache is null {
  if (!cache) {
    return true;
  }

  const medians = cache.departmentMedians as unknown;
  return (
    typeof medians === "object" &&
    medians !== null &&
    !("generalPractitioner" in medians)
  );
}

function buildEtpSnapshot(
  values: AplEtpValues | undefined,
  departmentMedian: number | null,
  note: string,
): AplEtpSnapshot {
  if (
    !values ||
    (values.value <= 0 && values.standardizedPopulation <= 0 && values.referencePopulation <= 0)
  ) {
    return unavailableEtpSnapshot("Commune absente du millésime APL DREES pour cette profession.");
  }

  return {
    year: values.year,
    value: values.value,
    departmentMedian,
    available: true,
    note,
  };
}

function loadLegacyCache(cache: Record<string, unknown>): AplCommuneCache | null {
  if (!cache.communes || typeof cache.communes !== "object") {
    return null;
  }

  const legacyMedians = cache.departmentMedians as Record<string, number> | undefined;
  if (!legacyMedians) {
    return null;
  }

  const communes: Record<string, AplCommuneCacheEntry> = {};
  for (const [inseeCode, rawEntry] of Object.entries(
    cache.communes as Record<string, { generalPractitioner: AplEtpValues }>,
  )) {
    if (!rawEntry?.generalPractitioner) {
      continue;
    }

    const placeholder: AplEtpValues = {
      year: rawEntry.generalPractitioner.year,
      value: 0,
      standardizedPopulation: 0,
      referencePopulation: 0,
    };

    communes[inseeCode] = {
      generalPractitioner: rawEntry.generalPractitioner as AplCommuneCacheEntry["generalPractitioner"],
      nurse: placeholder,
      physiotherapist: placeholder,
      dentist: placeholder,
    };
  }

  return {
    meta: {
      vintage: (cache.meta as { vintage?: number })?.vintage ?? APL_VINTAGE,
      ingestedAt: new Date().toISOString(),
    },
    departmentMedians: {
      generalPractitioner: legacyMedians,
      nurse: {},
      physiotherapist: {},
      dentist: {},
    },
    communes,
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

  let cache = loadJsonCache<AplCommuneCache>(CACHE_FILE);
  if (isLegacyAplCache(cache)) {
    cache = loadLegacyCache(loadJsonCache<Record<string, unknown>>(CACHE_FILE) ?? {});
  }

  const entry = cache?.communes[inseeCode];
  if (!entry) {
    return unavailableSnapshot(
      "Commune absente du millésime APL DREES (Mayotte non couverte ou code INSEE non diffusé).",
    );
  }

  const depCode = departmentCode ?? departmentCodeFromInsee(inseeCode);
  const gp = entry.generalPractitioner;

  return {
    available: true,
    generalPractitioner: {
      year: gp.year,
      value: gp.value,
      valueUnder65: gp.valueUnder65,
      departmentMedian: cache!.departmentMedians.generalPractitioner[depCode] ?? null,
      available: true,
      note: APL_GENERAL_PRACTITIONER_NOTE,
    },
    nurse: buildEtpSnapshot(
      entry.nurse,
      cache!.departmentMedians.nurse[depCode] ?? null,
      APL_NURSE_NOTE,
    ),
    physiotherapist: buildEtpSnapshot(
      entry.physiotherapist,
      cache!.departmentMedians.physiotherapist[depCode] ?? null,
      APL_PHYSIOTHERAPIST_NOTE,
    ),
    dentist: buildEtpSnapshot(
      entry.dentist,
      cache!.departmentMedians.dentist[depCode] ?? null,
      APL_DENTIST_NOTE,
    ),
  };
}

export { createAplSource };
