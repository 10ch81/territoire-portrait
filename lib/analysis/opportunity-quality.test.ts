import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { buildFinalTerritorialAnalysis } from "./evaluation-helpers";
import {
  ESS_RGE_OPPORTUNITY_PATTERN,
} from "./evaluation-helpers";
import { RGE_MIN_SIGNIFICANT_COUNT } from "./opportunity-quality";
import { chamonixProfile, palaiseauProfile } from "./reference-communes";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import {
  computeOpportunityQuality,
  hasOpportunityTraceability,
  isGenericOpportunity,
} from "./opportunity-quality";
import { ANALYSIS_OUTPUT_LIMITS } from "./prompt-limits";

describe("opportunity-quality — garde-fous", () => {
  it("rejette une mobilisation ESS/RGE générique sans enjeu local ni volume RGE", () => {
    const quality = computeOpportunityQuality(
      {
        id: "ess-1",
        theme: "ess_rge",
        target: "opportunities",
        sentence:
          "Mobiliser les acteurs ESS et RGE identifiés comme ressources potentielles pour des projets locaux (rénovation, services, insertion).",
        evidence: ["4 structure(s) RGE recensée(s)"],
        sourceKeys: ["sirene"],
        confidence: "medium",
      },
      { territory: chamonixProfile },
    );

    assert.equal(quality.isGeneric, true);
    assert.equal(quality.acceptable, false);
  });

  it("accepte une mobilisation ESS/RGE ancrée sur un enjeu local", () => {
    const facts = buildAnalysisFacts(chamonixProfile);
    const essFact = facts.find((fact) => fact.theme === "ess_rge" && fact.target === "opportunities");
    assert.ok(essFact);

    const quality = computeOpportunityQuality(essFact!, {
      territory: chamonixProfile,
      relatedWatchPointThemes: ["housing"],
    });

    assert.equal(quality.isGeneric, false);
    assert.equal(quality.acceptable, true);
  });
});

describe("opportunities — communes de référence", () => {
  it("Palaiseau — au plus 4 opportunités solides", () => {
    const { analysis } = buildFinalTerritorialAnalysis(palaiseauProfile);

    assert.ok(
      analysis.opportunities.length <= ANALYSIS_OUTPUT_LIMITS.opportunities.max,
      `Attendu ≤ ${ANALYSIS_OUTPUT_LIMITS.opportunities.max}, obtenu ${analysis.opportunities.length}`,
    );
  });

  it("Palaiseau — opportunités sélectionnées traçables", () => {
    const facts = buildAnalysisFacts(palaiseauProfile);
    const selected = selectAnalysisFactsForPrompt(facts, palaiseauProfile);
    const opportunities = selected.filter((fact) => fact.target === "opportunities");
    const relatedWatchPointThemes = selected
      .filter((fact) => fact.target === "watchPoints")
      .map((fact) => fact.theme);
    const relatedStrengthThemes = selected
      .filter((fact) => fact.target === "strengths")
      .map((fact) => fact.theme);

    assert.ok(opportunities.length >= 1);
    for (const opportunity of opportunities) {
      assert.ok(opportunity.sourceKeys.length > 0, opportunity.sentence);
      assert.ok(opportunity.evidence.length > 0, opportunity.sentence);
      assert.equal(
        isGenericOpportunity(opportunity, {
          territory: palaiseauProfile,
          relatedWatchPointThemes,
          relatedStrengthThemes,
        }),
        false,
        opportunity.sentence,
      );
    }
  });

  it("Chamonix — pas d'opportunité ESS/RGE forte si RGE très faible", () => {
    const rgeCount = chamonixProfile.enrichment?.enterprises?.rgeCount ?? 0;
    assert.ok(
      rgeCount < RGE_MIN_SIGNIFICANT_COUNT,
      `Précondition fixture : RGE faible (${rgeCount} < ${RGE_MIN_SIGNIFICANT_COUNT}).`,
    );

    const { analysis, selectedFacts } = buildFinalTerritorialAnalysis(chamonixProfile);
    const rgeOpportunities = analysis.opportunities.filter((item) =>
      ESS_RGE_OPPORTUNITY_PATTERN.test(item),
    );
    const selectedEssRge = selectedFacts.filter(
      (fact) => fact.target === "opportunities" && fact.theme === "ess_rge",
    );

    assert.equal(rgeOpportunities.length, 0, JSON.stringify(rgeOpportunities));
    assert.equal(selectedEssRge.length, 0, JSON.stringify(selectedEssRge));
  });

  it("Chamonix — opportunités restantes traçables", () => {
    const { selectedFacts } = buildFinalTerritorialAnalysis(chamonixProfile);
    const opportunities = selectedFacts.filter((fact) => fact.target === "opportunities");

    for (const opportunity of opportunities) {
      assert.ok(hasOpportunityTraceability(opportunity), opportunity.sentence);
    }
  });
});
