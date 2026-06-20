import { renderFactSentenceForOutput } from "@/lib/analysis/progressive-qualification";
import type { QualifiedAnalysisFact } from "@/lib/analysis/types";
import type { PortraitSectorBlock } from "../types";
import { resolveAssertiveLead } from "./assertive-labels";
import { polishSectorialSentence } from "./polish-sectorial-sentence";
import {
  getSectorDefinition,
  SECTOR_DEFINITIONS,
  type SectorRenderContext,
} from "./sector-catalog";
import { shouldSkipSector } from "./select-sectorial-facts";
import { renderSynthesisFromFacts } from "./synthesis-fragments";

function buildCautionClause(facts: QualifiedAnalysisFact[]): string | null {
  const cautionFacts = facts.filter((fact) => fact.requiresCaution);
  if (cautionFacts.length === 0) {
    return null;
  }

  const limitation = cautionFacts
    .flatMap((fact) => fact.limitations ?? [])
    .find((entry) =>
      /ne permet pas|sans données de fréquentation|à interpréter avec prudence \(SSMSI/i.test(
        entry,
      ),
    );

  if (limitation) {
    const cleaned = limitation.replace(/\s*;\s*ne pas[^.]*\.?$/i, "").trim();
    return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
  }

  return null;
}

function filterSectorFacts(
  sectorId: PortraitSectorBlock["id"],
  facts: QualifiedAnalysisFact[],
  ctx: SectorRenderContext,
): QualifiedAnalysisFact[] {
  let filtered = facts.filter((fact) => fact.confidence !== "low");

  if (sectorId === "identity" && resolveAssertiveLead("identity", ctx.territory)) {
    filtered = filtered.filter(
      (fact) =>
        fact.theme !== "centrality" ||
        !/principale commune|premier rang/i.test(fact.sentence),
    );
  }

  if (sectorId === "demography") {
    filtered = filtered.filter((fact) => !/^Types d'établissements/i.test(fact.sentence));
  }

  return filtered;
}

function joinParagraphParts(parts: string[]): string {
  const cleaned = parts.map((part) => part.trim()).filter((part) => part.length > 0);
  if (cleaned.length === 0) {
    return "";
  }

  return cleaned
    .map((part, index) => {
      const normalized = part.endsWith(".") ? part : `${part}.`;
      if (index === 0) {
        return normalized;
      }
      if (/^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ]/.test(part)) {
        return normalized;
      }
      return normalized.charAt(0).toLowerCase() + normalized.slice(1);
    })
    .join(" ");
}

export function renderSectorialBlock(
  sectorId: PortraitSectorBlock["id"],
  facts: QualifiedAnalysisFact[],
  ctx: SectorRenderContext,
): PortraitSectorBlock | null {
  const definition = getSectorDefinition(sectorId);

  if (shouldSkipSector(definition, facts) && sectorId !== "synthesis") {
    return null;
  }

  if (sectorId === "synthesis") {
    const paragraph = renderSynthesisFromFacts(facts, ctx.territory.name);
    if (!paragraph.trim()) {
      return null;
    }
    return {
      id: sectorId,
      index: 0,
      title: definition.title,
      paragraph,
      factIds: facts.map((fact) => fact.id),
    };
  }

  const assertiveLead = resolveAssertiveLead(sectorId, ctx.territory);
  const sectorFacts = filterSectorFacts(sectorId, facts, ctx);
  const sentences = sectorFacts.map((fact) =>
    polishSectorialSentence(renderFactSentenceForOutput(fact)),
  );
  const caution = buildCautionClause(facts);

  const parts = [assertiveLead, ...sentences, caution].filter((part): part is string =>
    Boolean(part?.trim()),
  );

  const paragraph = joinParagraphParts(parts);
  if (!paragraph.trim()) {
    return {
      id: sectorId,
      index: 0,
      title: definition.title,
      paragraph: "",
      factIds: [],
      omittedReason: "Aucun fait significatif disponible.",
    };
  }

  return {
    id: sectorId,
    index: 0,
    title: definition.title,
    paragraph,
    factIds: sectorFacts.map((fact) => fact.id),
  };
}

export function renderPortraitTitle(ctx: SectorRenderContext): string {
  const { territory } = ctx;
  const epci = territory.epci?.name;
  const epciRank = territory.enrichment?.geography?.epciComparison?.communeRankByPopulation;

  if (epci && epciRank === 1) {
    return `${territory.name}, commune-centre de ${epci}`;
  }
  if (epci) {
    return `${territory.name}, commune de ${epci}`;
  }
  if (territory.department?.name) {
    return `${territory.name} (${territory.department.name})`;
  }
  return territory.name;
}

export function renderAllSectorBlocks(
  selectedBySector: Map<PortraitSectorBlock["id"], QualifiedAnalysisFact[]>,
  ctx: SectorRenderContext,
): PortraitSectorBlock[] {
  const blocks: PortraitSectorBlock[] = [];
  let index = 1;

  for (const definition of SECTOR_DEFINITIONS) {
    const facts = selectedBySector.get(definition.id) ?? [];
    const block = renderSectorialBlock(definition.id, facts, ctx);
    if (!block || !block.paragraph.trim()) {
      continue;
    }
    blocks.push({ ...block, index });
    index += 1;
  }

  return blocks;
}
