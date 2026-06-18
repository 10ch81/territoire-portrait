import {
  analyzeBpeBreakdown,
  BPE_DOMAIN_BREAKDOWN_LABEL,
  BPE_EQUIPMENT_NOTE,
  BPE_TOP_TYPES_LABEL,
  BPE_TRANSPORT_NOTE_LIMITED,
  BPE_TRANSPORT_NOTE_WITH_TYPES,
  buildDomainCounts,
  sumTransportTypeCounts,
} from "../bpe-semantics";
import { createBpeSource } from "../sources";
import { loadJsonCache } from "./cache";
import type {
  BpeCommuneCache,
  BpeTypeLabels,
  EquipmentSnapshot,
  EquipmentTypeCount,
  TransportSnapshot,
} from "../types";

const BPE_CACHE_FILE = "bpe-by-commune.json";
const BPE_LABELS_FILE = "bpe-type-labels.json";

const BPE_DOMAIN_LABELS: Record<string, string> = {
  A: "Services pour les particuliers",
  B: "Commerces",
  C: "Enseignement",
  D: "Santé et action sociale",
  E: "Transports et déplacements",
  F: "Sports, loisirs et culture",
  G: "Tourisme",
};

function emptyEquipmentSnapshot(note: string): EquipmentSnapshot {
  return {
    year: 2024,
    totalEquipments: 0,
    byDomain: [],
    byType: [],
    transport: {
      totalEquipments: 0,
      byType: [],
      available: false,
      note,
    },
    available: false,
    note,
    domainBreakdownLabel: BPE_DOMAIN_BREAKDOWN_LABEL,
    topTypesLabel: BPE_TOP_TYPES_LABEL,
    qualitativeSummary: "",
    domainCountsAreTypeCounts: true,
  };
}

function loadBpeTypeLabels(): BpeTypeLabels {
  return loadJsonCache<BpeTypeLabels>(BPE_LABELS_FILE) ?? {};
}

function buildTypeCounts(
  byType: Record<string, number>,
  labels: BpeTypeLabels,
): EquipmentTypeCount[] {
  return Object.entries(byType)
    .map(([code, count]) => ({
      code,
      label: labels[code] ?? code,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildTransportSnapshot(
  byType: Record<string, number>,
  labels: BpeTypeLabels,
): TransportSnapshot {
  const transportTypes = Object.entries(byType)
    .filter(([code]) => code.startsWith("E"))
    .map(([code, count]) => ({
      code,
      label: labels[code] ?? code,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const transportEquipmentCount = sumTransportTypeCounts(byType);

  return {
    totalEquipments: transportEquipmentCount,
    byType: transportTypes,
    available: true,
    note:
      transportTypes.length > 0
        ? BPE_TRANSPORT_NOTE_WITH_TYPES
        : BPE_TRANSPORT_NOTE_LIMITED,
  };
}

export function loadEquipmentSnapshot(inseeCode: string): EquipmentSnapshot {
  const cache = loadJsonCache<BpeCommuneCache>(BPE_CACHE_FILE);
  const labels = loadBpeTypeLabels();
  const entry = cache?.[inseeCode];

  if (!entry) {
    return emptyEquipmentSnapshot(
      "Cache BPE absent. Exécutez « npm run ingest:bpe » pour activer les données d'équipements.",
    );
  }

  const byDomain = buildDomainCounts(entry.byDomain, BPE_DOMAIN_LABELS);
  const byType = buildTypeCounts(entry.byType ?? {}, labels);
  const semantics = analyzeBpeBreakdown(entry, byDomain);

  return {
    year: entry.year,
    totalEquipments: entry.total,
    byDomain,
    byType,
    transport: buildTransportSnapshot(entry.byType ?? {}, labels),
    available: true,
    note: BPE_EQUIPMENT_NOTE,
    domainBreakdownLabel: BPE_DOMAIN_BREAKDOWN_LABEL,
    topTypesLabel: BPE_TOP_TYPES_LABEL,
    qualitativeSummary: semantics.qualitativeSummary,
    domainCountsAreTypeCounts: semantics.domainMetric === "type-count",
  };
}

export { createBpeSource };
