import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { buildCanonicalAnalysisOutput } from "./build-canonical-output";
import { saintGironsProfile } from "./fixtures";
import { ANALYSIS_OUTPUT_LIMITS } from "./prompt-limits";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import { containsOptionalPluralMarker } from "./render-text";
import { hasForbiddenDerivedRatio } from "./verify-numeric-claims";
import { validateAnalysisOutput } from "./validate-output";

function collectOutputText(
  output: ReturnType<typeof validateAnalysisOutput>,
): string {
  return [
    output.summary,
    ...output.strengths,
    ...output.watchPoints,
    ...output.opportunities,
  ].join("\n");
}

describe("render-output", () => {
  it("Saint-Girons — sortie sans marqueurs (s) ni vocabulaire ARCEP legacy", () => {
    const territory = {
      ...saintGironsProfile,
      epci: { code: "200067940", name: "CC Couserans-Pyrénées" },
      densityPerKm2: 316,
    };
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(territory),
      territory,
    );
    const result = validateAnalysisOutput(
      buildCanonicalAnalysisOutput(territory, selected),
      selected,
      territory,
    );
    const text = collectOutputText(result);

    assert.equal(containsOptionalPluralMarker(text), false);
    assert.doesNotMatch(text, /logements (?:éligibles|peuvent être connectés) à la fibre/i);
    assert.match(text, /locaux (?:sont )?raccordables à la fibre/i);
    assert.doesNotMatch(text, /postes pour 100 habitants/i);
    assert.doesNotMatch(text, /avec la population recule/i);
    assert.doesNotMatch(text, /d['']avec\b/i);
    assert.match(result.summary, /Le portrait met en évidence/i);
  });

  it("Saint-Girons — watchPoints présents, séparés et dans la limite", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );
    const result = validateAnalysisOutput(
      buildCanonicalAnalysisOutput(saintGironsProfile, selected),
      selected,
      saintGironsProfile,
    );

    assert.ok(result.watchPoints.length >= ANALYSIS_OUTPUT_LIMITS.watchPoints.min);
    assert.ok(result.watchPoints.length <= ANALYSIS_OUTPUT_LIMITS.watchPoints.max);
    assert.ok(
      result.watchPoints.some((item) => /sécurité enregistrée|SSMSI/i.test(item)),
    );
    assert.ok(result.watchPoints.some((item) => /CATNAT|inondation/i.test(item)));
    assert.notEqual(
      result.watchPoints.filter((item) => /SSMSI|sécurité enregistrée/i.test(item)).length,
      0,
    );
    assert.ok(
      result.watchPoints.every((item) => selected.some((fact) => fact.sentence === item)),
    );
  });

  it("rejette un ratio inventé absent des analysisFacts", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    assert.equal(
      hasForbiddenDerivedRatio("Environ 50 postes pour 100 habitants selon l'IA.", facts),
      true,
    );
  });
});
