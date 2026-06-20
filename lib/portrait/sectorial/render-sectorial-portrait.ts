import { buildAnalysisFacts } from "@/lib/analysis/build-analysis-facts";
import { buildTerritoryContext } from "@/lib/analysis/context/buildTerritoryContext";
import { classifyEditorialProfile } from "@/lib/analysis/editorial/classifyEditorialProfile";
import { qualifyAnalysisFacts } from "@/lib/analysis/qualify-facts";
import { computeDataLimits } from "@/lib/data-limits";
import type { TerritoryProfile } from "@/lib/types";
import { buildPortraitClosingSynthesis } from "../build-closing-synthesis";
import type { PortraitNarrative } from "../types";
import {
  renderAllSectorBlocks,
  renderPortraitTitle,
} from "./render-sectorial-block";
import type { SectorRenderContext } from "./sector-catalog";
import { selectSectorialFacts } from "./select-sectorial-facts";
import { buildSectorialSupplementFacts } from "./sectorial-supplement-facts";

function buildSectorContext(territory: TerritoryProfile): SectorRenderContext {
  const facts = buildAnalysisFacts(territory);
  const supplementFacts = buildSectorialSupplementFacts(territory);
  const territoryContext = buildTerritoryContext(territory);
  const qualifiedFacts = qualifyAnalysisFacts([...facts, ...supplementFacts], {
    territory,
    territoryContext,
  });

  return {
    territory,
    territoryContext,
    qualifiedFacts,
  };
}

export function renderSectorialPortrait(territory: TerritoryProfile): PortraitNarrative {
  const ctx = buildSectorContext(territory);
  const selectedBySector = selectSectorialFacts(ctx.qualifiedFacts, ctx);
  const sectors = renderAllSectorBlocks(selectedBySector, ctx);
  const profileId = classifyEditorialProfile(
    territory,
    ctx.territoryContext,
    ctx.qualifiedFacts,
  );

  return {
    title: renderPortraitTitle(ctx),
    paragraphs: sectors.map((sector) => sector.paragraph),
    sectors,
    closingSynthesis: buildPortraitClosingSynthesis(territory),
    profileId,
    generatedBy: "deterministic",
    dataLimits: computeDataLimits(territory),
  };
}
