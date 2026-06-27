import { COMPARE_INDICATOR_MAP } from "./indicators";
import { COMPARE_THEMATIC_PROFILES } from "./profiles";
import type { CompareBlock, CompareHighlight } from "./types";

export const COMPARE_PRIORITY_IDS = COMPARE_THEMATIC_PROFILES.map((profile) => profile.id);

const VALID_PRIORITY_IDS = new Set(COMPARE_PRIORITY_IDS);

/** Ancien jeu complet (7 profils) avant profils collectivité — pas un filtre partiel. */
const LEGACY_FULL_PRIORITY_IDS = [
  "familial",
  "logement",
  "revenus",
  "equipee",
  "mobile",
  "dynamique",
  "dense",
] as const;

function isLegacyFullPrioritySelection(priorityIds: string[]): boolean {
  if (priorityIds.length !== LEGACY_FULL_PRIORITY_IDS.length) {
    return false;
  }
  return LEGACY_FULL_PRIORITY_IDS.every((id) => priorityIds.includes(id));
}

export function isValidComparePriorityId(id: string): boolean {
  return VALID_PRIORITY_IDS.has(id);
}

export function parseComparePrioritiesParam(
  raw: string | string[] | undefined,
): string[] {
  const joined = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const seen = new Set<string>();
  const priorities: string[] = [];

  for (const part of joined.split(/[,;\s]+/)) {
    const trimmed = part.trim();
    if (!trimmed || !isValidComparePriorityId(trimmed) || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    priorities.push(trimmed);
  }

  return priorities;
}

export function serializeComparePrioritiesParam(priorityIds: string[]): string | null {
  const valid = priorityIds.filter(isValidComparePriorityId);
  if (valid.length === 0 || valid.length === COMPARE_PRIORITY_IDS.length) {
    return null;
  }
  return valid.join(",");
}

/** Vide, complet ou sélection legacy 7 profils = pas de filtre (comportement par défaut). */
export function shouldFilterByPriorities(priorityIds: string[]): boolean {
  if (priorityIds.length === 0 || isLegacyFullPrioritySelection(priorityIds)) {
    return false;
  }
  return priorityIds.length < COMPARE_PRIORITY_IDS.length;
}

export function filterHighlightsByPriorities(
  highlights: CompareHighlight[],
  priorityIds: string[],
): CompareHighlight[] {
  if (!shouldFilterByPriorities(priorityIds)) {
    return highlights;
  }

  const allowed = new Set(priorityIds);
  const filtered = highlights.filter((item) => allowed.has(item.profileId));
  return filtered.length > 0 ? filtered : highlights;
}

export function orderCompareBlocksByPriorities(
  blocks: CompareBlock[],
  priorityIds: string[],
): CompareBlock[] {
  if (!shouldFilterByPriorities(priorityIds)) {
    return blocks;
  }

  const prioritySet = new Set(priorityIds);
  const blockRank = new Map<string, number>();

  for (const profile of COMPARE_THEMATIC_PROFILES) {
    if (!prioritySet.has(profile.id)) {
      continue;
    }

    const profileIndex = priorityIds.indexOf(profile.id);
    for (const indicatorId of profile.indicatorIds) {
      const blockId = COMPARE_INDICATOR_MAP.get(indicatorId)?.blockId;
      if (blockId !== undefined && !blockRank.has(blockId)) {
        blockRank.set(blockId, profileIndex);
      }
    }
  }

  return [...blocks].sort((left, right) => {
    const leftRank = blockRank.get(left.id) ?? Number.POSITIVE_INFINITY;
    const rightRank = blockRank.get(right.id) ?? Number.POSITIVE_INFINITY;
    return leftRank - rightRank;
  });
}

export function getComparePriorityLabel(id: string): string | null {
  return COMPARE_THEMATIC_PROFILES.find((profile) => profile.id === id)?.label ?? null;
}
