import { createEducationSource, createIpsSource } from "../sources";
import { isJsonCachePresent, loadJsonCache } from "./cache";
import type {
  EducationAggregateCount,
  EducationCommuneCache,
  EducationSnapshot,
  IpsCommuneCache,
} from "../types";

const CACHE_FILE = "education-by-commune.json";
const IPS_CACHE_FILE = "ips-by-commune.json";

const IPS_NOTE =
  "IPS moyen des écoles éligibles (≥ 25 élèves de CM2 sur 5 ans) — indicateur d'établissement, pas un diagnostic communal exhaustif.";

const IPS_ABSENT_FIELDS = {
  ipsSchoolYear: null,
  averageIps: null,
  schoolsWithIps: null,
  ipsMin: null,
  ipsMax: null,
  ipsNote: null,
} as const;

function mapCounts(record: Record<string, number>): EducationAggregateCount[] {
  return Object.entries(record)
    .map(([label, count]) => ({ code: label, label, count }))
    .sort((a, b) => b.count - a.count);
}

function buildIpsFields(
  ipsEntry: IpsCommuneCache[string] | undefined,
): Pick<
  EducationSnapshot,
  | "ipsSchoolYear"
  | "averageIps"
  | "schoolsWithIps"
  | "ipsMin"
  | "ipsMax"
  | "ipsNote"
> {
  if (!ipsEntry) {
    return {
      ...IPS_ABSENT_FIELDS,
      ipsNote: isJsonCachePresent(IPS_CACHE_FILE)
        ? "Aucune école avec IPS recensée sur cette commune pour le millésime chargé."
        : "Cache IPS absent. Exécutez « npm run ingest:ips ».",
    };
  }

  return {
    ipsSchoolYear: ipsEntry.schoolYear,
    averageIps: ipsEntry.averageIps,
    schoolsWithIps: ipsEntry.schoolsWithIps,
    ipsMin: ipsEntry.ipsMin,
    ipsMax: ipsEntry.ipsMax,
    ipsNote: IPS_NOTE,
  };
}

export function loadEducationSnapshot(inseeCode: string): EducationSnapshot {
  const ipsFields = buildIpsFields(
    loadJsonCache<IpsCommuneCache>(IPS_CACHE_FILE)?.[inseeCode],
  );

  if (!isJsonCachePresent(CACHE_FILE)) {
    return {
      year: 2026,
      totalOpen: 0,
      byType: [],
      bySector: [],
      byLevel: [],
      ...ipsFields,
      available: false,
      note:
        "Cache Annuaire Éducation absent. Exécutez « npm run ingest:education » pour activer la scolarisation.",
    };
  }

  const cache = loadJsonCache<EducationCommuneCache>(CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry || entry.totalOpen === 0) {
    return {
      year: 2026,
      totalOpen: 0,
      byType: [],
      bySector: [],
      byLevel: [],
      ...ipsFields,
      available: ipsFields.averageIps !== null,
      note:
        entry || ipsFields.averageIps !== null
          ? "Aucun établissement scolaire ouvert recensé sur cette commune."
          : "Aucun établissement scolaire ouvert recensé sur cette commune.",
    };
  }

  return {
    year: entry.year,
    totalOpen: entry.totalOpen,
    byType: mapCounts(entry.byType),
    bySector: mapCounts(entry.bySector),
    byLevel: mapCounts(entry.byLevel),
    ...ipsFields,
    available: true,
    note:
      "Annuaire de l'Éducation — établissements ouverts ; complémentaire au dénombrement BPE (domaine C).",
  };
}

export { createEducationSource, createIpsSource };
