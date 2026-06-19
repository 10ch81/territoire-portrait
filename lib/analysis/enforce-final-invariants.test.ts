import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enforceFinalAnalysisInvariants,
  hasFinalInternalLeakage,
  stripFinalInternalLeakage,
} from "./enforce-final-invariants";
import type { TerritoryAnalysis } from "../types";

function baseAnalysis(overrides: Partial<TerritoryAnalysis> = {}): TerritoryAnalysis {
  return {
    summary: "Résumé territorial valide.",
    strengths: ["Point fort A.", "Point fort B."],
    watchPoints: ["Point d'attention A."],
    opportunities: ["Opportunité A.", "Opportunité B."],
    dataLimits: ["Limite documentée."],
    ...overrides,
  };
}

describe("enforceFinalAnalysisInvariants", () => {
  it("tronque les listes aux plafonds produit", () => {
    const result = enforceFinalAnalysisInvariants(
      baseAnalysis({
        strengths: ["A", "B", "C", "D", "E"],
        watchPoints: ["1", "2", "3", "4", "5", "6"],
        opportunities: ["O1", "O2", "O3", "O4", "O5"],
      }),
    );

    assert.equal(result.strengths.length, 4);
    assert.equal(result.watchPoints.length, 5);
    assert.equal(result.opportunities.length, 4);
  });

  it("retire les entrées vides et les doublons exacts", () => {
    const result = enforceFinalAnalysisInvariants(
      baseAnalysis({
        strengths: ["  Alpha.  ", "", "Alpha.", "Beta."],
        watchPoints: ["   ", "Gamma.", "Gamma."],
        opportunities: ["Delta.", ""],
      }),
    );

    assert.deepEqual(result.strengths, ["Alpha.", "Beta."]);
    assert.deepEqual(result.watchPoints, ["Gamma."]);
    assert.deepEqual(result.opportunities, ["Delta."]);
  });

  it("retire les fuites internes du summary et des listes", () => {
    const result = enforceFinalAnalysisInvariants(
      baseAnalysis({
        summary: "Portrait valide avec fuite analysisFacts interne.",
        strengths: ["Force correcte.", "sanitize: texte interne."],
        watchPoints: ["rawFacts exposé ici."],
        opportunities: ["Piste correcte."],
      }),
    );

    assert.equal(hasFinalInternalLeakage(result.summary), false);
    assert.equal(result.strengths.length, 1);
    assert.equal(result.watchPoints.length, 0);
    assert.match(result.summary, /Portrait valide avec fuite/);
    assert.doesNotMatch(result.summary, /analysisfacts/i);
  });

  it("préserve dataLimits", () => {
    const limits = ["Limite A.", "Limite B."];
    const result = enforceFinalAnalysisInvariants(baseAnalysis({ dataLimits: limits }));
    assert.deepEqual(result.dataLimits, limits);
  });
});

describe("stripFinalInternalLeakage", () => {
  it("détecte les marqueurs finaux demandés", () => {
    assert.equal(hasFinalInternalLeakage("Voir rawFacts et sanitize"), true);
    assert.equal(hasFinalInternalLeakage("Le mot fact seul"), true);
    assert.equal(stripFinalInternalLeakage("Le mot fact seul"), "Le mot seul");
  });

  it("détecte une fuite en tête de phrase après un libellé sans fuite", () => {
    assert.equal(hasFinalInternalLeakage("Texte valide."), false);
    assert.equal(hasFinalInternalLeakage("sanitize en tête de phrase"), true);
  });
});
