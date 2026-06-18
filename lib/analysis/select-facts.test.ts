import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import {
  dedupeSelectedFacts,
  hasDuplicateIndicatorInTarget,
  indicatorKeys,
} from "./dedupe-facts";
import { createPanelProfile, saintGironsProfile } from "./fixtures";
import {
  isEligibleWatchPointUpgrade,
  scoreWatchPointCandidate,
} from "./score-facts";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import type { AnalysisFact } from "./types";

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
  it("limite le volume et garde sécurité/risques séparés si présents", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all, saintGironsProfile);

    assert.ok(selected.length <= 22);
    assert.ok(selected.length >= 4);

    const security = selected.find((f) => f.theme === "security");
    const risks = selected.find((f) => f.theme === "risks");
    if (security && risks) {
      assert.notEqual(security.id, risks.id);
      assert.doesNotMatch(security.sentence, /CATNAT|Géorisques/i);
      assert.doesNotMatch(risks.sentence, /SSMSI/i);
    }
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

  it("produit 3 à 4 watchPoints sans checklist obligatoire", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all, saintGironsProfile);
    const watchPoints = selected.filter((f) => f.target === "watchPoints");

    assert.ok(watchPoints.length >= 3);
    assert.ok(watchPoints.length <= 4);
  });

  it("ne conserve pas un watchPoint faible si un constat prioritaire mieux scoré est disponible", () => {
    const profile = createPanelProfile("fullEnrichment");
    const context = { territory: profile };

    const weakWatchPoint: AnalysisFact = {
      id: "watch-weak-tourism",
      theme: "tourism",
      target: "watchPoints",
      sentence:
        "Capacité d'hébergement touristique limitée, à interpréter avec prudence selon les données disponibles.",
      evidence: ["tourism"],
      sourceKeys: ["tourism"],
      confidence: "medium",
      year: 2024,
    };

    const strongWatchPoint: AnalysisFact = {
      id: "watch-strong-income",
      theme: "income",
      target: "watchPoints",
      sentence:
        "Revenu médian disponible par unité de consommation inférieur aux références régionales recensées.",
      evidence: ["sociodemographics"],
      sourceKeys: ["filosofi"],
      confidence: "high",
      year: 2021,
      numericBindings: [
        {
          value: 19_500,
          label: "revenu médian disponible",
          theme: "income",
          allowedContexts: ["revenu", "médian"],
        },
      ],
    };

    const all = [
      ...buildAnalysisFacts(profile).filter((fact) => fact.id !== weakWatchPoint.id),
      weakWatchPoint,
      strongWatchPoint,
    ];

    const selected = selectAnalysisFactsForPrompt(all, profile);
    const watchPoints = selected.filter((fact) => fact.target === "watchPoints");

    const eligibleUnselected = all.filter(
      (fact) =>
        fact.target === "watchPoints" &&
        !watchPoints.some((selectedFact) => selectedFact.id === fact.id) &&
        isEligibleWatchPointUpgrade(fact, context),
    );

    for (const watchPoint of watchPoints) {
      const watchScore = scoreWatchPointCandidate(watchPoint, context);
      for (const candidate of eligibleUnselected) {
        const candidateScore = scoreWatchPointCandidate(candidate, context);
        const couldReplace = candidateScore > watchScore;
        assert.equal(
          couldReplace,
          false,
          `un constat prioritaire (${candidate.id}) ne devrait pas rester écarté au profit de ${watchPoint.id}`,
        );
      }
    }
  });

  it("conserve sécurité et risques séparés lorsqu'ils coexistent", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all, saintGironsProfile);
    const security = selected.find((f) => f.theme === "security");
    const risks = selected.find((f) => f.theme === "risks");

    if (security && risks) {
      assert.notEqual(security.id, risks.id);
      assert.doesNotMatch(security.sentence, /CATNAT|Géorisques/i);
      assert.doesNotMatch(risks.sentence, /SSMSI/i);
    }
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
