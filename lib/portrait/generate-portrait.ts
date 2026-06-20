import { isMistralConfigured } from "@/lib/mistral";
import type { TerritoryProfile } from "@/lib/types";
import {
  isPortraitMistralPolishEnabled,
  polishPortraitWithMistral,
} from "./sectorial/polish-portrait-mistral";
import { renderSectorialPortrait } from "./sectorial/render-sectorial-portrait";
import { selectSectorialFacts } from "./sectorial/select-sectorial-facts";
import { buildTerritoryContext } from "@/lib/analysis/context/buildTerritoryContext";
import { buildAnalysisFacts } from "@/lib/analysis/build-analysis-facts";
import { qualifyAnalysisFacts } from "@/lib/analysis/qualify-facts";
import { validateSectorialPortrait } from "./sectorial/validate-sectorial-portrait";
import { polishedPortraitPreservesNumericClaims } from "./sectorial/preserve-numeric-claims";
import type { PortraitGenerationResult } from "./types";

export const portraitNarrativeModel = "deterministic-sectorial";

export async function generatePortraitNarrative(
  territory: TerritoryProfile,
): Promise<PortraitGenerationResult> {
  const deterministic = renderSectorialPortrait(territory);

  const facts = buildAnalysisFacts(territory);
  const territoryContext = buildTerritoryContext(territory);
  const qualifiedFacts = qualifyAnalysisFacts(facts, { territory, territoryContext });
  const selectedBySector = selectSectorialFacts(qualifiedFacts, {
    territory,
    territoryContext,
    qualifiedFacts,
  });
  const violations = validateSectorialPortrait(deterministic, selectedBySector, {
    territory,
    territoryContext,
    qualifiedFacts,
  });

  if (violations.length > 0) {
    console.warn("Portrait sectoriel — violations de validation:", violations);
  }

  if (!isPortraitMistralPolishEnabled() || !isMistralConfigured()) {
    return { portrait: deterministic };
  }

  const polished = await polishPortraitWithMistral(deterministic);
  if (!polished) {
    return { portrait: deterministic };
  }

  const polishViolations = validateSectorialPortrait(polished, selectedBySector, {
    territory,
    territoryContext,
    qualifiedFacts,
  });

  if (
    polishViolations.length > 0 ||
    !polishedPortraitPreservesNumericClaims(deterministic, polished, qualifiedFacts)
  ) {
    return { portrait: deterministic };
  }

  return { portrait: polished };
}

export function isPortraitNarrativeAvailable(): boolean {
  return true;
}

export function generatePortraitNarrativeSync(
  territory: TerritoryProfile,
): PortraitGenerationResult {
  return { portrait: renderSectorialPortrait(territory) };
}
