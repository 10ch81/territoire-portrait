import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import {
  buildCanonicalAnalysisOutput,
  buildDeterministicSummary,
  buildVerbatimLists,
  resolveVerbatimList,
} from "./build-canonical-output";
import { saintGironsProfile } from "./fixtures";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import { hasForbiddenDerivedRatio } from "./verify-numeric-claims";
import { validateAnalysisOutput } from "./validate-output";

describe("build-canonical-output", () => {
  it("compose un résumé déterministe en deux phrases", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );
    const summary = buildDeterministicSummary(saintGironsProfile, selected);

    assert.match(summary, /Saint-Girons, commune de 6[\s\u202f]?008 habitants en 2022/);
    assert.match(summary, /Couserans Pyren/);
    assert.match(summary, /280 habitants\/km²/);
    assert.match(summary, /Elle combine .+ avec .+\./);
    assert.match(summary, /-5,7\s*%/);
    assert.doesNotMatch(summary, /d['']avec\b/i);
    assert.doesNotMatch(summary, /des avec\b/i);
  });

  it("produit des listes verbatim depuis les constats sélectionnés", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );
    const lists = buildVerbatimLists(selected);

    assert.ok(lists.strengths.length >= 3);
    assert.ok(lists.watchPoints.length >= 4);
    assert.ok(lists.strengths.every((item) => selected.some((fact) => fact.sentence === item)));
    assert.ok(
      lists.watchPoints.some((item) => /16,2\s*%/.test(item) || /18,8\s*%/.test(item)),
    );
  });

  it("réordonne les listes sans modifier le texte source", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );
    const canonical = buildCanonicalAnalysisOutput(saintGironsProfile, selected);
    const reversed = [...canonical.watchPoints].reverse();

    const resolved = resolveVerbatimList(reversed, "watchPoints", selected);
    assert.deepEqual(resolved, reversed);
    assert.notDeepEqual(resolved, canonical.watchPoints);
  });

  it("ignore un ratio inventé par Mistral", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    assert.equal(
      hasForbiddenDerivedRatio("Environ 50 postes pour 100 habitants selon l'IA.", facts),
      true,
    );
    assert.equal(
      hasForbiddenDerivedRatio(
        facts.find((f) => f.theme === "employment_sectors" && f.target === "strengths")!
          .sentence,
        facts,
      ),
      false,
    );
  });

  it("validateAnalysisOutput force le résumé déterministe et les listes verbatim", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );
    const canonical = buildCanonicalAnalysisOutput(saintGironsProfile, selected);

    const result = validateAnalysisOutput(
      {
        summary: "Résumé inventé par Mistral avec pôle structurant du Couserans.",
        strengths: ["Dynamique économique significative avec 50 postes pour 100 habitants."],
        watchPoints: ["Tendance à interpréter avec prudence la sécurité locale."],
        opportunities: [],
      },
      selected,
      saintGironsProfile,
    );

    assert.equal(result.summary, canonical.summary);
    assert.deepEqual(result.strengths, canonical.strengths);
    assert.ok(result.watchPoints.every((item) => selected.some((fact) => fact.sentence === item)));
    assert.doesNotMatch(result.summary, /pôle structurant/i);
    assert.doesNotMatch(result.strengths.join(" "), /50 postes pour 100 habitants/i);
  });
});
