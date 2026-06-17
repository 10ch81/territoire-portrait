import { createBpeSource } from "../sources";
import { loadJsonCache } from "./cache";
import type {
  BpeCommuneCache,
  BpeTypeLabels,
  EquipmentDomainCount,
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
  domainCount: number,
): TransportSnapshot {
  const transportTypes = Object.entries(byType)
    .filter(([code]) => code.startsWith("E"))
    .map(([code, count]) => ({
      code,
      label: labels[code] ?? code,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalEquipments: domainCount,
    byType: transportTypes,
    available: true,
    note:
      domainCount > 0
        ? "Équipements de transport recensés dans la BPE 2024 (gares, arrêts, aéroports, etc.)."
        : "Aucun équipement de transport recensé dans la BPE 2024 sur la commune.",
  };
}

export function loadEquipmentSnapshot(inseeCode: string): EquipmentSnapshot {
  const cache = loadJsonCache<BpeCommuneCache>(BPE_CACHE_FILE);
  const labels = loadBpeTypeLabels();
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2024,
      totalEquipments: 0,
      byDomain: [],
      byType: [],
      transport: {
        totalEquipments: 0,
        byType: [],
        available: false,
        note:
          "Cache BPE absent. Exécutez « npm run ingest:bpe » pour activer les données d'équipements.",
      },
      available: false,
      note:
        "Cache BPE absent. Exécutez « npm run ingest:bpe » pour activer les données d'équipements.",
    };
  }

  const byDomain: EquipmentDomainCount[] = Object.entries(entry.byDomain)
    .map(([code, count]) => ({
      code,
      label: BPE_DOMAIN_LABELS[code] ?? code,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const byType = buildTypeCounts(entry.byType ?? {}, labels);
  const transportDomainCount = entry.byDomain.E ?? 0;

  return {
    year: entry.year,
    totalEquipments: entry.total,
    byDomain,
    byType,
    transport: buildTransportSnapshot(entry.byType ?? {}, labels, transportDomainCount),
    available: true,
    note:
      "Dénombrement INSEE BPE 2024 par domaine et principaux types d'équipements (commune).",
  };
}

export { createBpeSource };
