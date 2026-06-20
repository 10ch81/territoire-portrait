import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { angersProfile, chamonixProfile, poulxProfile } from "./reference-communes";
import {
  qualifiesAsStrongEmploymentStrength,
  qualifiesAsStrongEquipmentStrength,
  qualifiesAsStrongYouthStrength,
  qualifiesForAttractiveUrbanOpening,
} from "./strength-signals";
import { buildStrengthSummaryPhrase } from "./strength-summary-fragments";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import { buildFinalTerritorialAnalysis } from "./evaluation-helpers";
import { ANALYSIS_OUTPUT_LIMITS } from "./prompt-limits";

describe("strength-signals", () => {
  it("Angers — emploi, équipements et jeunes au signal fort", () => {
    assert.ok(qualifiesAsStrongEmploymentStrength(angersProfile));
    assert.ok(qualifiesAsStrongEquipmentStrength(angersProfile));
    assert.ok(qualifiesAsStrongYouthStrength(angersProfile));
    assert.ok(qualifiesForAttractiveUrbanOpening(angersProfile));
  });

  it("Chamonix — pas d'ouverture ville-centre attractive (densité insuffisante)", () => {
    assert.equal(qualifiesForAttractiveUrbanOpening(chamonixProfile), false);
  });

  it("Poulx — pas d'ouverture 1A (commune peu dense)", () => {
    assert.equal(qualifiesForAttractiveUrbanOpening(poulxProfile), false);
  });
});

describe("strength selection et phrase 1", () => {
  it("Angers — max 5 strengths signal fort, résumé éditorial sans liste strengths", () => {
    const facts = buildAnalysisFacts(angersProfile);
    const selected = selectAnalysisFactsForPrompt(facts, angersProfile);
    const strengths = selected.filter((fact) => fact.target === "strengths");

    assert.ok(strengths.length >= ANALYSIS_OUTPUT_LIMITS.strengths.min);
    assert.ok(strengths.length <= ANALYSIS_OUTPUT_LIMITS.strengths.max);
    assert.ok(strengths.some((fact) => fact.theme === "employment_sectors"));
    assert.ok(strengths.some((fact) => fact.theme === "equipments"));
    assert.ok(strengths.some((fact) => /moins de 30 ans/i.test(fact.sentence)));

    const phrase = buildStrengthSummaryPhrase(strengths);
    assert.match(phrase, /postes salariés/i);
    assert.match(phrase, /équipements recensés/i);

    const { analysis } = buildFinalTerritorialAnalysis(angersProfile);
    assert.ok(analysis.editorial);
    assert.match(
      analysis.editorial!.summary,
      /ville-centre attractive et bien équipée/i,
    );
    assert.match(analysis.editorial!.summary, /postes salariés/i);
    assert.equal(analysis.editorial!.strengths.length, 0);
  });
});
