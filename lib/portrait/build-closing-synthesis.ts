import { buildAnalysisFacts } from "@/lib/analysis/build-analysis-facts";
import { buildTerritoryContext } from "@/lib/analysis/context/buildTerritoryContext";
import { buildFinalTerritorialAnalysis } from "@/lib/analysis/evaluation-helpers";
import { renderFactSentenceForOutput } from "@/lib/analysis/progressive-qualification";
import { qualifyAnalysisFacts } from "@/lib/analysis/qualify-facts";
import type { TerritoryProfile } from "@/lib/types";
import { selectSectorialFacts } from "./sectorial/select-sectorial-facts";
import {
  selectSynthesisWatchFacts,
} from "./sectorial/synthesis-fragments";
import { buildSectorialSupplementFacts } from "./sectorial/sectorial-supplement-facts";
import type { PortraitClosingSynthesis } from "./types";

function buildSectorRenderContext(territory: TerritoryProfile) {
  const facts = buildAnalysisFacts(territory);
  const supplementFacts = buildSectorialSupplementFacts(territory);
  const territoryContext = buildTerritoryContext(territory);
  const qualifiedFacts = qualifyAnalysisFacts([...facts, ...supplementFacts], {
    territory,
    territoryContext,
  });

  return { territory, territoryContext, qualifiedFacts };
}

/** Synthèse de clôture du portrait : résumé canonique + vigilance portrait + opportunités. */
export function buildPortraitClosingSynthesis(
  territory: TerritoryProfile,
): PortraitClosingSynthesis {
  const { analysis } = buildFinalTerritorialAnalysis(territory);
  const ctx = buildSectorRenderContext(territory);
  const selectedBySector = selectSectorialFacts(ctx.qualifiedFacts, ctx);
  const synthesisFacts = selectedBySector.get("synthesis") ?? [];
  const watchFacts = selectSynthesisWatchFacts(
    synthesisFacts.filter((fact) => fact.target === "watchPoints"),
    ctx,
  );

  return {
    resume: analysis.summary,
    watchPoints: watchFacts.map((fact) => renderFactSentenceForOutput(fact)),
    opportunities: analysis.opportunities,
  };
}
