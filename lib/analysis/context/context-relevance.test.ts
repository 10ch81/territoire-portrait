import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "../build-analysis-facts";
import { buildFinalTerritorialAnalysis } from "../evaluation-helpers";
import { resolveDisplayTypologyLabel } from "./displayTypologyLabel";
import {
  isMechanicalLargeCityStrength,
} from "./context-relevance";
import { buildTerritoryContext } from "./buildTerritoryContext";
import { selectAnalysisFactsForPrompt } from "../select-facts";
import { ANALYSIS_OUTPUT_LIMITS } from "../prompt-limits";
import {
  bousseLikeProfile,
  rennesLikeProfile,
} from "../contextual-reference-profiles";
import { chamonixProfile, palaiseauProfile } from "../reference-communes";

describe("context-relevance — communes de référence", () => {
  describe("Rennes-like (35238)", () => {
    const context = buildTerritoryContext(rennesLikeProfile);

    it("identifie une grande ville", () => {
      assert.equal(context.isLargeCity, true);
    });

    it("pénalise France Services unique comme point fort", () => {
      const facts = buildAnalysisFacts(rennesLikeProfile);
      const franceServices = facts.find(
        (f) => f.theme === "public_services" && /France Services/i.test(f.sentence),
      );
      assert.ok(franceServices);
      assert.equal(
        isMechanicalLargeCityStrength(franceServices!, rennesLikeProfile, context),
        true,
      );
    });

    it("n'inclut pas France Services ni fibre générique dans les forces sélectionnées", () => {
      const facts = buildAnalysisFacts(rennesLikeProfile);
      const selected = selectAnalysisFactsForPrompt(facts, rennesLikeProfile);
      const strengths = selected.filter((f) => f.target === "strengths");

      assert.ok(!strengths.some((f) => f.theme === "public_services"));
      assert.ok(
        !strengths.some(
          (f) => f.theme === "connectivity" && /fibre/i.test(f.sentence) && !/fracture|retard/i.test(f.sentence),
        ),
      );
      assert.ok(
        strengths.some((f) =>
          ["equipments", "employment_sectors", "centrality", "health", "education"].includes(
            f.theme,
          ),
        ),
      );
    });

    it("n'inclut pas France Services comme opportunité prioritaire", () => {
      const facts = buildAnalysisFacts(rennesLikeProfile);
      const opportunities = selectAnalysisFactsForPrompt(facts, rennesLikeProfile).filter(
        (f) => f.target === "opportunities",
      );

      assert.ok(
        !opportunities.some(
          (f) => f.theme === "public_services" && /France Services/i.test(f.sentence),
        ),
      );
      assert.ok(opportunities.length <= ANALYSIS_OUTPUT_LIMITS.opportunities.max);
    });
  });

  describe("Chamonix (74056)", () => {
    it("affiche un libellé typologique touristique de montagne", () => {
      const label = resolveDisplayTypologyLabel(chamonixProfile);
      assert.ok(label);
      assert.match(label!, /montagne|touristique|centralit/i);
      assert.doesNotMatch(label!, /^petite centralité rurale$/);
    });

    it("n'inclut pas France Services ni fibre générique dans forces et opportunités", () => {
      const { analysis, selectedFacts } = buildFinalTerritorialAnalysis(chamonixProfile);
      const strengths = selectedFacts.filter((f) => f.target === "strengths");

      assert.ok(!strengths.some((f) => f.theme === "public_services"));
      assert.ok(
        !strengths.some(
          (f) => f.theme === "connectivity" && /fibre|raccordables/i.test(f.sentence),
        ),
      );
      assert.ok(
        !analysis.opportunities.some(
          (sentence) => /France Services/i.test(sentence),
        ),
      );
      assert.ok(
        !analysis.opportunities.some(
          (sentence) => /fibre|numérique/i.test(sentence),
        ),
      );
    });

    it("expose la prudence progressive dans la sortie finale", () => {
      const { analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
      const outputTexts = [
        analysis.summary,
        ...analysis.strengths,
        ...analysis.watchPoints,
        ...analysis.opportunities,
      ].join("\n");

      assert.match(
        outputTexts,
        /Interprétation prudente|population résidente|fréquentation touristique/i,
      );
    });

    it("summary ne se limite pas à petite centralité rurale", () => {
      const { analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
      assert.doesNotMatch(analysis.summary, /petite centralité rurale de/i);
      assert.match(analysis.summary, /montagne|touristique|centralit/i);
    });

    it("contextualise la dette avec les recettes si disponibles", () => {
      const { selectedFacts, analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
      const debtWatch = selectedFacts.filter(
        (f) => f.theme === "finances" && f.target === "watchPoints",
      );
      const debtTexts = [
        analysis.summary,
        ...analysis.watchPoints,
        ...selectedFacts.map((f) => f.sentence),
      ].join("\n");

      assert.ok(
        !debtWatch.some((f) => /€ par habitant/i.test(f.sentence) && !/recettes/i.test(f.sentence)),
        "Dette/habitant seule ne doit pas être watchPoint si recettes disponibles.",
      );
      assert.match(debtTexts, /recettes de fonctionnement|recettes/i);
    });
  });

  describe("Bousse-like (57190)", () => {
    it("signale un risque petits effectifs sécurité", () => {
      const context = buildTerritoryContext(bousseLikeProfile);
      assert.equal(context.securitySmallNumbersRisk, true);
    });

    it("mentionne la prudence petits effectifs dans le constat sécurité", () => {
      const facts = buildAnalysisFacts(bousseLikeProfile);
      const security = facts.find((f) => f.theme === "security");
      assert.ok(security);
      assert.match(
        security!.sentence,
        /faible volume de faits|diffusion partielle/i,
      );
    });

    it("limite les opportunités", () => {
      const { analysis } = buildFinalTerritorialAnalysis(bousseLikeProfile);
      assert.ok(analysis.opportunities.length <= ANALYSIS_OUTPUT_LIMITS.opportunities.max);
    });
  });

  describe("Palaiseau (91477) — non-régression", () => {
    it("n'inclut pas la fibre générique dans les forces", () => {
      const { selectedFacts } = buildFinalTerritorialAnalysis(palaiseauProfile);
      const strengths = selectedFacts.filter((f) => f.target === "strengths");

      assert.ok(
        !strengths.some(
          (f) => f.theme === "connectivity" && /fibre|raccordables/i.test(f.sentence),
        ),
      );
    });

    it("conserve une formulation sécurité singulière", () => {
      const { analysis } = buildFinalTerritorialAnalysis(palaiseauProfile);
      const securityTexts = [analysis.summary, ...analysis.watchPoints].join("\n");
      assert.match(securityTexts, /Un indicateur de sécurité|un indicateur de sécurité/i);
    });

    it("opportunités limitées", () => {
      const { analysis } = buildFinalTerritorialAnalysis(palaiseauProfile);
      assert.ok(analysis.opportunities.length <= ANALYSIS_OUTPUT_LIMITS.opportunities.max);
    });
  });
});

describe("resolveDisplayTypologyLabel", () => {
  it("retourne le libellé brut si pas de surcharge touristique", () => {
    const label = resolveDisplayTypologyLabel(palaiseauProfile);
    assert.ok(label);
  });
});
