import { compareFactQuality, areSemanticallySimilar } from "@/lib/analysis/dedupe-facts";
import { scoreAnalysisFact } from "@/lib/analysis/score-facts";
import type { QualifiedAnalysisFact } from "@/lib/analysis/types";
import type { PortraitSectorId } from "../types";
import {
  SECTOR_DEFINITIONS,
  type SectorDefinition,
  type SectorRenderContext,
} from "./sector-catalog";
import { isSectorialEligibleFact } from "./polish-sectorial-sentence";

function matchesSlot(
  fact: QualifiedAnalysisFact,
  definition: SectorDefinition,
  slotIndex: number,
  ctx: SectorRenderContext,
): boolean {
  const slot = definition.slots[slotIndex];
  if (!slot) return false;
  if (!slot.themes.includes(fact.theme)) return false;
  if (slot.predicate && !slot.predicate(fact, ctx)) return false;
  return true;
}

function sortCandidates(
  candidates: QualifiedAnalysisFact[],
  ctx: SectorRenderContext,
): QualifiedAnalysisFact[] {
  return [...candidates].sort((a, b) => {
    const scoreDiff = scoreAnalysisFact(b, ctx) - scoreAnalysisFact(a, ctx);
    if (scoreDiff !== 0) return scoreDiff;
    return compareFactQuality(b, a, ctx);
  });
}

function isSectorialDuplicate(
  existing: QualifiedAnalysisFact,
  candidate: QualifiedAnalysisFact,
): boolean {
  if (areSemanticallySimilar(existing, candidate)) {
    const existingVacancy = /vacance|vacants/i.test(existing.sentence);
    const candidateVacancy = /vacance|vacants/i.test(candidate.sentence);
    if (existingVacancy !== candidateVacancy) {
      return false;
    }
    return true;
  }
  return false;
}

function pickForSlot(
  facts: QualifiedAnalysisFact[],
  definition: SectorDefinition,
  slotIndex: number,
  alreadySelected: QualifiedAnalysisFact[],
  ctx: SectorRenderContext,
): QualifiedAnalysisFact[] {
  const slot = definition.slots[slotIndex];
  if (!slot) return [];

  const candidates = sortCandidates(
    facts.filter(
      (fact) =>
        isSectorialEligibleFact(fact) &&
        matchesSlot(fact, definition, slotIndex, ctx) &&
        (slot.role === "caution" || fact.confidence !== "low"),
    ),
    ctx,
  );

  const selected: QualifiedAnalysisFact[] = [];
  for (const candidate of candidates) {
    if (selected.length >= slot.maxCount) break;
    const duplicate = [...alreadySelected, ...selected].some((fact) =>
      isSectorialDuplicate(fact, candidate),
    );
    if (duplicate) continue;
    selected.push(candidate);
  }

  return selected;
}

export function selectSectorialFacts(
  qualifiedFacts: QualifiedAnalysisFact[],
  ctx: SectorRenderContext,
): Map<PortraitSectorId, QualifiedAnalysisFact[]> {
  const result = new Map<PortraitSectorId, QualifiedAnalysisFact[]>();

  for (const definition of SECTOR_DEFINITIONS) {
    const sectorFacts: QualifiedAnalysisFact[] = [];

    for (let slotIndex = 0; slotIndex < definition.slots.length; slotIndex += 1) {
      const slotFacts = pickForSlot(qualifiedFacts, definition, slotIndex, sectorFacts, ctx);
      sectorFacts.push(...slotFacts);
    }

    result.set(definition.id, sectorFacts);
  }

  return result;
}

export function sectorHasLeadFacts(
  definition: SectorDefinition,
  facts: QualifiedAnalysisFact[],
): boolean {
  const leadThemes = new Set(
    definition.slots.filter((slot) => slot.role === "lead").flatMap((slot) => slot.themes),
  );
  return facts.some((fact) => leadThemes.has(fact.theme));
}

export function shouldSkipSector(
  definition: SectorDefinition,
  facts: QualifiedAnalysisFact[],
): boolean {
  if (!definition.skipIfEmpty) {
    return false;
  }
  return !sectorHasLeadFacts(definition, facts);
}
