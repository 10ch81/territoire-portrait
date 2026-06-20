import { isSelectedFactCovered } from "@/lib/analysis/ensure-output-coverage";
import type { QualifiedAnalysisFact } from "@/lib/analysis/types";
import { hasForbiddenDerivedRatio } from "@/lib/analysis/verify-numeric-claims";
import { containsForbiddenPhrases } from "@/lib/mistral-sanitize";
import type { TerritoryProfile } from "@/lib/types";
import {
  findUnauthorizedAssertiveLabels,
  resolveAssertiveLead,
} from "./assertive-labels";
import {
  SECTOR_DEFINITIONS,
  type SectorRenderContext,
} from "./sector-catalog";
import { sectorHasLeadFacts, shouldSkipSector } from "./select-sectorial-facts";
import type { PortraitNarrative, PortraitSectorId } from "../types";

const CROSS_THEME_PATTERNS: Array<{ pattern: RegExp; rule: string }> = [
  {
    pattern: /\b(?:SSMSI|sécurité enregistrée)\b.*\b(?:CATNAT|inondation|Géorisques)\b/i,
    rule: "security-risks-mix",
  },
  {
    pattern: /\b(?:CATNAT|inondation|Géorisques)\b.*\b(?:SSMSI|sécurité enregistrée)\b/i,
    rule: "risks-security-mix",
  },
  {
    pattern: /\btendance à la hausse\b/i,
    rule: "single-year-trend",
  },
  {
    pattern: /\bhausse constante\b/i,
    rule: "undocumented-trend",
  },
  {
    pattern: /\bbien supérieur à la moyenne nationale\b/i,
    rule: "undocumented-national-benchmark",
  },
  {
    pattern: /\bcœur battant\b/i,
    rule: "editorial-metaphor",
  },
];

export type SectorialViolation =
  | { code: "FORBIDDEN_PHRASE"; paragraph: number; detail: string }
  | { code: "CROSS_THEME_MIX"; paragraph: number; rule: string }
  | { code: "MISSING_SECTOR"; sectorId: PortraitSectorId }
  | { code: "ASSERTIVE_WITHOUT_SIGNAL"; paragraph: number; label: string }
  | { code: "DERIVED_RATIO"; paragraph: number }
  | { code: "PARAGRAPH_COUNT"; expectedMin: number; actual: number }
  | { code: "EMPTY_PARAGRAPH"; paragraph: number };

function sectorDataAvailable(
  sectorId: PortraitSectorId,
  territory: TerritoryProfile,
): boolean {
  const enrichment = territory.enrichment;
  if (!enrichment) return false;

  switch (sectorId) {
    case "identity":
      return territory.population !== null;
    case "demography":
      return enrichment.sociodemographics?.available === true;
    case "economy":
      return (
        enrichment.employmentSectors?.available === true ||
        enrichment.enterprises?.inseeEstablishments != null
      );
    case "social_fragility":
      return (
        enrichment.sociodemographics?.unemploymentRate != null ||
        enrichment.urbanPolicy?.hasQpv === true ||
        enrichment.labourMarket?.available === true
      );
    case "equipments":
      return enrichment.equipments?.available === true;
    case "health":
      return enrichment.health?.available === true;
    case "housing":
      return enrichment.housing?.available === true;
    case "mobility":
      return (
        enrichment.mobility?.commute?.available === true ||
        enrichment.mobility?.connectivity?.available === true
      );
    case "environmental_risks":
      return enrichment.risks?.available === true;
    case "security":
      return enrichment.security?.available === true;
    case "tourism":
      return enrichment.tourism?.available === true;
    case "public_finances":
      return (
        enrichment.publicAccounts?.available === true ||
        enrichment.fiscal?.available === true
      );
    case "synthesis":
      return true;
    default: {
      const _exhaustive: never = sectorId;
      return _exhaustive;
    }
  }
}

export function validateSectorialPortrait(
  portrait: PortraitNarrative,
  selectedBySector: Map<PortraitSectorId, QualifiedAnalysisFact[]>,
  ctx: SectorRenderContext,
): SectorialViolation[] {
  const violations: SectorialViolation[] = [];
  const allFacts = ctx.qualifiedFacts;

  for (const definition of SECTOR_DEFINITIONS) {
    if (definition.id === "synthesis") continue;
    if (!sectorDataAvailable(definition.id, ctx.territory)) continue;
    if (shouldSkipSector(definition, selectedBySector.get(definition.id) ?? [])) {
      violations.push({ code: "MISSING_SECTOR", sectorId: definition.id });
    }
  }

  const minParagraphs = ctx.territory.population !== null && ctx.territory.population >= 50_000 ? 8 : 6;
  if (portrait.paragraphs.length < minParagraphs) {
    violations.push({
      code: "PARAGRAPH_COUNT",
      expectedMin: minParagraphs,
      actual: portrait.paragraphs.length,
    });
  }

  portrait.paragraphs.forEach((paragraph, index) => {
    if (!paragraph.trim()) {
      violations.push({ code: "EMPTY_PARAGRAPH", paragraph: index + 1 });
      return;
    }

    for (const phrase of containsForbiddenPhrases(paragraph)) {
      violations.push({
        code: "FORBIDDEN_PHRASE",
        paragraph: index + 1,
        detail: phrase,
      });
    }

    for (const { pattern, rule } of CROSS_THEME_PATTERNS) {
      if (pattern.test(paragraph)) {
        violations.push({ code: "CROSS_THEME_MIX", paragraph: index + 1, rule });
      }
    }

    if (hasForbiddenDerivedRatio(paragraph, allFacts)) {
      violations.push({ code: "DERIVED_RATIO", paragraph: index + 1 });
    }

    for (const label of findUnauthorizedAssertiveLabels(paragraph)) {
      const sectorId = label.replace("assertive:", "") as PortraitSectorId;
      if (!resolveAssertiveLead(sectorId, ctx.territory)) {
        violations.push({
          code: "ASSERTIVE_WITHOUT_SIGNAL",
          paragraph: index + 1,
          label,
        });
      }
    }
  });

  return violations;
}

export function sectorFactsCoveredByPortrait(
  portrait: PortraitNarrative,
  facts: QualifiedAnalysisFact[],
): boolean {
  return facts.every((fact) => isSelectedFactCovered(fact, portrait.paragraphs));
}

export function missingSectorCoverage(
  selectedBySector: Map<PortraitSectorId, QualifiedAnalysisFact[]>,
  portrait: PortraitNarrative,
): PortraitSectorId[] {
  const missing: PortraitSectorId[] = [];

  for (const definition of SECTOR_DEFINITIONS) {
    const facts = selectedBySector.get(definition.id) ?? [];
    if (!sectorHasLeadFacts(definition, facts)) continue;
    const covered = facts.some((fact) => isSelectedFactCovered(fact, portrait.paragraphs));
    if (!covered) {
      missing.push(definition.id);
    }
  }

  return missing;
}
