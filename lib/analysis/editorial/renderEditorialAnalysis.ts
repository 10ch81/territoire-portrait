import type { EditorialAnalysisOutput, TerritoryProfile } from "../../types";
import { buildVerbatimLists } from "../build-canonical-output";
import { renderFactSentenceForOutput } from "../progressive-qualification";
import type { AnalysisFact, QualifiedAnalysisFact } from "../types";
import type { TerritoryContext } from "../context/buildTerritoryContext";
import { resolveClassifiedEditorialProfile } from "./classifyEditorialProfile";
import {
  applyEditorialQualityGuards,
  guardEditorialSummary,
} from "./editorialQualityGuards";
import { applyEditorialPolish } from "./editorialPolish";
import { renderOpportunityByProfile } from "./renderOpportunityByProfile";
import { renderSummaryByProfileWithFallback } from "./renderSummaryByProfile";

export function renderEditorialAnalysis(
  territory: TerritoryProfile,
  context: TerritoryContext,
  selectedFacts: AnalysisFact[],
  mvpSummary: string,
  qualifiedFacts: QualifiedAnalysisFact[] = [],
): EditorialAnalysisOutput {
  const profile = resolveClassifiedEditorialProfile(territory, context, qualifiedFacts);
  const summary = guardEditorialSummary(
    renderSummaryByProfileWithFallback(territory, profile, selectedFacts),
    mvpSummary,
    selectedFacts,
  );

  const strengths: string[] = [];
  const verbatim = buildVerbatimLists(selectedFacts);
  const opportunities = renderOpportunityByProfile(profile, selectedFacts);
  const mvpOpportunities = selectedFacts
    .filter((fact) => fact.target === "opportunities")
    .map((fact) => renderFactSentenceForOutput(fact));

  const editorial: EditorialAnalysisOutput = applyEditorialPolish(
    {
      profileId: profile.id,
      summary,
      strengths,
      watchPoints: verbatim.watchPoints.map((sentence, index) => {
        const fact = selectedFacts.filter((f) => f.target === "watchPoints")[index];
        return fact ? renderFactSentenceForOutput(fact) : sentence;
      }),
      opportunities,
    },
    mvpOpportunities,
  );

  return applyEditorialQualityGuards(editorial, mvpSummary, selectedFacts);
}
