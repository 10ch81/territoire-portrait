import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { buildFinalTerritorialAnalysis } from "./evaluation-helpers";
import {
  OPPORTUNITY_MAX_GENERICITY_SCORE,
  applyProgressiveCaution,
  renderFactSentenceForOutput,
  isProgressiveOpportunityEligible,
  isProgressiveWatchPointEligible,
  qualifyProgressiveDimensions,
  resolveOpportunityGenericityScore,
} from "./progressive-qualification";
import { qualifyAnalysisFacts } from "./qualify-facts";
import { chamonixProfile, palaiseauProfile } from "./reference-communes";
import { buildTerritoryContext } from "./context/buildTerritoryContext";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import type { AnalysisFact, QualifiedAnalysisFact } from "./types";

function qualifiedByTheme(
  facts: QualifiedAnalysisFact[],
  theme: AnalysisFact["theme"],
): QualifiedAnalysisFact | undefined {
  return facts.find((fact) => fact.theme === theme);
}

describe("progressive-qualification", () => {
  describe("qualifyProgressiveDimensions — thèmes prioritaires", () => {
    it("Palaiseau — sécurité avec benchmark départemental", () => {
      const facts = buildAnalysisFacts(palaiseauProfile);
      const security = facts.find((f) => f.theme === "security");
      assert.ok(security);

      const context = buildTerritoryContext(palaiseauProfile);
      const progressive = qualifyProgressiveDimensions(
        security!,
        palaiseauProfile,
        context,
      );

      assert.equal(progressive.benchmarkStatus, "available");
      assert.notEqual(progressive.evidenceLevel, "weak_signal");
      assert.ok(progressive.significanceLevel === "medium" || progressive.significanceLevel === "high");
    });

    it("Palaiseau — vieillissement sans benchmark territorial", () => {
      const facts = buildAnalysisFacts(palaiseauProfile);
      const ageing = facts.find((f) => f.theme === "ageing");
      assert.ok(ageing);

      const context = buildTerritoryContext(palaiseauProfile);
      const progressive = qualifyProgressiveDimensions(ageing!, palaiseauProfile, context);

      assert.equal(progressive.benchmarkStatus, "missing");
      assert.equal(isProgressiveWatchPointEligible({ ...ageing!, ...progressive } as QualifiedAnalysisFact), false);
    });

    it("Chamonix — finances dette avec prudence si recettes absentes du constat", () => {
      const facts = buildAnalysisFacts(chamonixProfile);
      const debt = facts.find((f) => f.theme === "finances" && /dette/i.test(f.sentence));
      assert.ok(debt);

      const context = buildTerritoryContext(chamonixProfile);
      const progressive = qualifyProgressiveDimensions(debt!, chamonixProfile, context);

      assert.ok(
        progressive.evidenceLevel === "single_indicator" ||
          progressive.evidenceLevel === "direct_moderate",
      );
      assert.ok(typeof progressive.genericityScore === "number");
    });

    it("rejette une opportunité générique (score élevé)", () => {
      const context = buildTerritoryContext(chamonixProfile);
      const genericOpportunity: AnalysisFact = {
        id: "opp-generic",
        theme: "ess_rge",
        target: "opportunities",
        sentence:
          "Mobiliser les acteurs ESS et RGE identifiés comme ressources potentielles pour des projets locaux (rénovation, services, insertion).",
        evidence: ["4 structure(s) RGE recensée(s)"],
        sourceKeys: ["sirene"],
        confidence: "medium",
      };

      const progressive = qualifyProgressiveDimensions(
        genericOpportunity,
        chamonixProfile,
        context,
      );

      assert.ok(progressive.genericityScore >= OPPORTUNITY_MAX_GENERICITY_SCORE);
      assert.equal(
        isProgressiveOpportunityEligible({
          ...genericOpportunity,
          ...progressive,
          polarity: "positive",
          intensity: "medium",
          eligibleTargets: ["opportunities"],
        } as QualifiedAnalysisFact),
        false,
      );
    });
  });

  describe("isProgressiveWatchPointEligible", () => {
    it("rejette weak_signal", () => {
      const fact: QualifiedAnalysisFact = {
        id: "wp-1",
        theme: "security",
        target: "watchPoints",
        sentence: "Signal faible.",
        evidence: [],
        sourceKeys: [],
        confidence: "low",
        polarity: "negative",
        intensity: "high",
        eligibleTargets: ["watchPoints"],
        evidenceLevel: "weak_signal",
        significanceLevel: "low",
        benchmarkStatus: "available",
        genericityScore: 0,
        actionabilityScore: 0,
        denominatorRisk: "none",
        requiresCaution: false,
      };

      assert.equal(isProgressiveWatchPointEligible(fact), false);
    });
  });

  describe("applyProgressiveCaution", () => {
    it("ne modifie pas la phrase source", () => {
      const fact: AnalysisFact = {
        id: "tourism-1",
        theme: "tourism",
        target: "strengths",
        sentence: "Capacité d'hébergement élevée.",
        evidence: ["12000 places"],
        sourceKeys: ["tourism"],
        confidence: "medium",
      };

      const qualified: QualifiedAnalysisFact = {
        ...fact,
        polarity: "positive",
        intensity: "medium",
        eligibleTargets: ["strengths"],
        evidenceLevel: "contextual",
        significanceLevel: "medium",
        benchmarkStatus: "not_required",
        genericityScore: 0,
        actionabilityScore: 50,
        denominatorRisk: "tourist_population",
        requiresCaution: true,
      };

      const cautioned = applyProgressiveCaution(fact, qualified);
      assert.equal(cautioned.sentence, fact.sentence);
      assert.equal(renderFactSentenceForOutput(cautioned), fact.sentence);
    });
  });

  describe("non-régression — sélection", () => {
    it("Palaiseau — pas de watchPoint vieillissement sans benchmark", () => {
      const facts = buildAnalysisFacts(palaiseauProfile);
      const qualified = qualifyAnalysisFacts(facts, { territory: palaiseauProfile });
      const ageing = qualifiedByTheme(qualified, "ageing");
      assert.ok(ageing);
      assert.equal(ageing!.benchmarkStatus, "missing");

      const selected = selectAnalysisFactsForPrompt(facts, palaiseauProfile);
      const ageingWatch = selected.filter(
        (f) => f.theme === "ageing" && f.target === "watchPoints",
      );
      assert.equal(ageingWatch.length, 0);
    });

    it("Chamonix — pas de suffixe mécanique de prudence en sortie", () => {
      const { analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
      const outputTexts = [
        analysis.summary,
        ...analysis.strengths,
        ...analysis.watchPoints,
        ...analysis.opportunities,
      ].join("\n");
      assert.doesNotMatch(outputTexts, / — Interprétation prudente/i);
    });

    it("Chamonix — opportunités sélectionnées sous le seuil de généricité", () => {
      const facts = buildAnalysisFacts(chamonixProfile);
      const selected = selectAnalysisFactsForPrompt(facts, chamonixProfile);
      const opportunities = selected.filter((f) => f.target === "opportunities");
      const watchThemes = selected
        .filter((f) => f.target === "watchPoints")
        .map((f) => f.theme);

      for (const opp of opportunities) {
        const liveGenericity = resolveOpportunityGenericityScore(
          opp,
          chamonixProfile,
          watchThemes,
        );
        assert.ok(
          liveGenericity < OPPORTUNITY_MAX_GENERICITY_SCORE,
          `Opportunité trop générique (${liveGenericity}) : ${opp.sentence}`,
        );
      }
    });
  });
});
