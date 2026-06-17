import { createBpeSource } from "../sources";
import { loadJsonCache } from "./cache";
import type {
  BpeCommuneCache,
  EquipmentDomainCount,
  EquipmentSnapshot,
  EquipmentTypeCount,
} from "../types";

const BPE_CACHE_FILE = "bpe-by-commune.json";

const BPE_DOMAIN_LABELS: Record<string, string> = {
  A: "Services pour les particuliers",
  B: "Commerces",
  C: "Enseignement",
  D: "Santé et action sociale",
  E: "Transports et déplacements",
  F: "Sports, loisirs et culture",
  G: "Tourisme",
};

export function loadEquipmentSnapshot(inseeCode: string): EquipmentSnapshot {
  const cache = loadJsonCache<BpeCommuneCache>(BPE_CACHE_FILE);
  const entry = cache?.[inseeCode];

  if (!entry) {
    return {
      year: 2024,
      totalEquipments: 0,
      byDomain: [],
      byType: [],
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

  const byType: EquipmentTypeCount[] = Object.entries(entry.byType ?? {})
    .map(([code, count]) => ({
      code,
      label: code,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    year: entry.year,
    totalEquipments: entry.total,
    byDomain,
    byType,
    available: true,
    note:
      "Dénombrement INSEE BPE 2024 par domaine et principaux types d'équipements (commune).",
  };
}

export { createBpeSource };
