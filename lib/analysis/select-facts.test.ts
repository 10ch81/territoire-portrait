import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import {
  dedupeSelectedFacts,
  hasDuplicateIndicatorInTarget,
  indicatorKeys,
} from "./dedupe-facts";
import { saintGironsProfile } from "./fixtures";
import { selectAnalysisFactsForPrompt } from "./select-facts";

describe("dedupe-facts", () => {
  it("indicatorKeys distingue deux valeurs d'un même thème", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const housingFacts = facts.filter((f) => f.theme === "housing");
    assert.ok(housingFacts.length >= 2);

    const keys = new Set(housingFacts.flatMap((f) => indicatorKeys(f)));
    assert.ok(keys.size >= 2);
  });

  it("dedupeSelectedFacts supprime les doublons d'indicateur par rubrique", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all, saintGironsProfile);
    const deduped = dedupeSelectedFacts(selected, { territory: saintGironsProfile });

    for (const target of ["summary", "strengths", "watchPoints", "opportunities"] as const) {
      assert.equal(hasDuplicateIndicatorInTarget(deduped, target), false);
    }
  });
});

describe("selectAnalysisFactsForPrompt", () => {
  it("limite le volume et conserve sécurité + risques séparés", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all, saintGironsProfile);

    assert.ok(selected.length <= 22);
    assert.ok(selected.length >= 4);

    const security = selected.find((f) => f.theme === "security");
    const risks = selected.find((f) => f.theme === "risks");
    assert.ok(security);
    assert.ok(risks);
  });

  it("évite les doublons d'indicateur dans une même rubrique", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all, saintGironsProfile);

    for (const target of ["watchPoints", "opportunities"] as const) {
      assert.equal(hasDuplicateIndicatorInTarget(selected, target), false);
    }
  });

  it("équilibre les watchPoints sur plusieurs thèmes", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all, saintGironsProfile);
    const watchThemes = new Set(
      selected.filter((f) => f.target === "watchPoints").map((f) => f.theme),
    );

    assert.ok(watchThemes.size >= 3);
    assert.ok(watchThemes.has("housing") || watchThemes.has("social_housing"));
  });

  it("priorise centralité et services dans les strengths", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all, saintGironsProfile);
    const strengthThemes = selected
      .filter((f) => f.target === "strengths")
      .map((f) => f.theme);

    assert.ok(
      strengthThemes.includes("equipments") ||
        strengthThemes.includes("employment_sectors") ||
        strengthThemes.includes("health"),
    );
  });

  it("produit au moins 3 watchPoints si 4 familles d'enjeux robustes", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all, saintGironsProfile);
    const watchPoints = selected.filter((f) => f.target === "watchPoints");

    assert.ok(watchPoints.length >= 3);
    assert.ok(watchPoints.some((f) => f.theme === "security"));
    assert.ok(watchPoints.some((f) => f.theme === "risks"));
  });

  it("inclut démographie et emploi dans watchPoints lorsque enjeux signalés", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all, saintGironsProfile);
    const watchPoints = selected.filter((f) => f.target === "watchPoints");
    const watchThemes = new Set(watchPoints.map((f) => f.theme));

    assert.ok(watchThemes.has("demography"), "recul démographique attendu");
    assert.ok(watchThemes.has("employment"), "chômage élevé attendu");
  });

  it("sépare tourisme et France Services dans les strengths", () => {
    const profile = {
      ...saintGironsProfile,
      enrichment: {
        ...saintGironsProfile.enrichment!,
        proximityServices: {
          year: 2024,
          franceServicesCount: 1,
          structureLabels: ["Structure test"],
          available: true,
          note: "",
        },
      },
    };
    const selected = selectAnalysisFactsForPrompt(buildAnalysisFacts(profile), profile);
    const strengths = selected.filter((f) => f.target === "strengths");
    const hasTourism = strengths.some((f) => f.theme === "tourism");
    const hasFranceServices = strengths.some((f) => f.theme === "public_services");

    if (hasTourism && hasFranceServices) {
      assert.fail("Tourisme et France Services ne doivent pas coexister dans les strengths");
    }
  });
});
