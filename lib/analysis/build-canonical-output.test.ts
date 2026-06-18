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
    const territory = {
      ...saintGironsProfile,
      epci: { code: "200067940", name: "CC Couserans-Pyrénées" },
      densityPerKm2: 316,
    };
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(territory),
      territory,
    );
    const summary = buildDeterministicSummary(territory, selected);

    assert.match(summary, /Saint-Girons, commune de 6[\s\u202f]?008 habitants en 2022/);
    assert.match(summary, /appartient à la CC Couserans-Pyrénées \(Ariège\)/);
    assert.match(summary, /316 habitants\/km²/);
    assert.match(summary, /Le portrait met en évidence/i);
    assert.match(summary, /recul de population de 5,7\s*% entre 2010 et 2022/);
    assert.match(summary, /enjeux liés à/i);
    assert.doesNotMatch(summary, /recul de population de -/i);
    assert.doesNotMatch(summary, /avec la population recule/i);
    assert.doesNotMatch(summary, /structure\(s\)/i);
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
    assert.doesNotMatch(
      facts.find((f) => f.theme === "employment_sectors" && f.target === "strengths")!.sentence,
      /postes pour 100 habitants/i,
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

  it("préserve EPCI et densité quand le nom contient Pyrénées", () => {
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
      {
        summary: "Saint-Girons, commune de 6 008 habitants en 2022.",
        strengths: [],
        watchPoints: [],
        opportunities: [],
      },
      selected,
      territory,
    );

    assert.match(result.summary, /appartient à la CC Couserans-Pyrénées \(Ariège\)/);
    assert.match(result.summary, /316 habitants\/km²/);
    assert.doesNotMatch(result.summary, /^Saint-Girons, commune de 6[\s\u202f]?008 habitants en 2022\.\s*Elle combine/);
    assert.match(result.summary, /Le portrait met en évidence/i);
  });
});
