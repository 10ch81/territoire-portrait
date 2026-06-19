import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { buildFinalTerritorialAnalysis } from "./evaluation-helpers";
import { ruralProfileMinimal, saintGironsProfile } from "./fixtures";
import { chamonixProfile, palaiseauProfile } from "./reference-communes";
import {
  assessSecurityIndicators,
  buildSecurityWatchPointSentence,
  countSecurityIndicatorsAboveReference,
  resolveSecurityWatchPointFormulation,
  SECURITY_REFERENCE_EXCESS_RATIO,
} from "./security-indicators";

describe("security-indicators", () => {
  it("ignore les écarts inférieurs au seuil +10 %", () => {
    const assessments = assessSecurityIndicators([
      {
        id: "test",
        label: "Test",
        count: 10,
        ratePer1000: 5.4,
        departmentRatePer1000: 5.0,
        diffused: true,
      },
    ]);

    assert.equal(assessments.length, 1);
    assert.equal(assessments[0].aboveReference, false);
    assert.ok(assessments[0].ratio < SECURITY_REFERENCE_EXCESS_RATIO);
  });

  it("qualifie un dépassement significatif (+10 %)", () => {
    const assessments = assessSecurityIndicators([
      {
        id: "test",
        label: "Test",
        count: 10,
        ratePer1000: 5.51,
        departmentRatePer1000: 5.0,
        diffused: true,
      },
    ]);

    assert.equal(assessments[0].aboveReference, true);
  });
});

describe("buildSecurityFacts — formulations", () => {
  it("Palaiseau — formulation singulière (un seul indicateur au-dessus)", () => {
    const assessments = assessSecurityIndicators(
      palaiseauProfile.enrichment!.security!.indicators,
    );
    const aboveCount = countSecurityIndicatorsAboveReference(assessments);

    assert.equal(
      aboveCount,
      1,
      "Précondition : cambriolages seuls dépassent la référence avec le seuil +10 %.",
    );

    const { formulation } = resolveSecurityWatchPointFormulation(assessments);
    assert.equal(formulation, "single");

    const facts = buildAnalysisFacts(palaiseauProfile);
    const security = facts.find((fact) => fact.theme === "security");

    assert.ok(security);
    assert.match(security!.sentence, /^Un indicateur de sécurité — Cambriolages de logement —/);
    assert.match(security!.sentence, /SSMSI/);
    assert.doesNotMatch(security!.sentence, /Certains indicateurs/i);
    assert.doesNotMatch(security!.sentence, /Plusieurs indicateurs/i);
    assert.match(security!.summaryIssuePhrase!, /un indicateur de sécurité \(cambriolages de logement\)/i);
  });

  it("Chamonix — formulation plurielle si plusieurs indicateurs dépassent", () => {
    const security = chamonixProfile.enrichment!.security!;
    const assessments = assessSecurityIndicators(security.indicators);
    const aboveCount = countSecurityIndicatorsAboveReference(assessments);

    assert.ok(
      aboveCount >= 2,
      `Précondition : au moins deux indicateurs SSMSI au-dessus de la référence (obtenu ${aboveCount}).`,
    );

    const { formulation } = resolveSecurityWatchPointFormulation(assessments);
    assert.ok(
      formulation === "multiple" || formulation === "majority",
      `Attendu multiple ou majority, obtenu ${formulation}.`,
    );

    const sentence = buildSecurityWatchPointSentence(security, assessments);
    assert.ok(sentence);
    assert.match(sentence!, /Plusieurs indicateurs|Certains indicateurs/);
    assert.doesNotMatch(sentence!, /^Un indicateur de sécurité —/);

    const { analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
    const securityTexts = [
      analysis.summary,
      ...analysis.watchPoints,
      ...analysis.strengths,
    ].join("\n");

    assert.match(securityTexts, /Plusieurs indicateurs|Certains indicateurs/);
    assert.doesNotMatch(securityTexts, /^Un indicateur de sécurité —/m);
  });

  it("Saint-Girons — formulation singulière avec un seul indicateur SSMSI", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const security = facts.find((fact) => fact.theme === "security");

    assert.ok(security);
    assert.match(security!.sentence, /^Un indicateur de sécurité —/);
    assert.match(security!.sentence, /SSMSI/);
    assert.doesNotMatch(security!.sentence, /Certains indicateurs/i);
  });

  it("SSMSI — pas de constat si taux communal inférieur à la référence", () => {
    const belowDeptProfile: typeof saintGironsProfile = {
      ...saintGironsProfile,
      enrichment: {
        ...saintGironsProfile.enrichment!,
        security: {
          year: 2024,
          indicators: [
            {
              id: "violences",
              label: "Violences physiques",
              count: 10,
              ratePer1000: 2.0,
              departmentRatePer1000: 5.2,
              diffused: true,
            },
          ],
          diffusedIndicatorCount: 1,
          available: true,
          note: "",
        },
      },
    };
    const facts = buildAnalysisFacts(belowDeptProfile);
    const security = facts.find((fact) => fact.theme === "security");

    assert.equal(security, undefined, "pas de constat sécurité si taux sous référence départementale");
  });

  it("SSMSI — pas de constat si écart inférieur au seuil +10 %", () => {
    const marginalProfile: typeof saintGironsProfile = {
      ...saintGironsProfile,
      enrichment: {
        ...saintGironsProfile.enrichment!,
        security: {
          year: 2024,
          indicators: [
            {
              id: "violences",
              label: "Violences physiques",
              count: 10,
              ratePer1000: 5.4,
              departmentRatePer1000: 5.0,
              diffused: true,
            },
          ],
          diffusedIndicatorCount: 1,
          available: true,
          note: "",
        },
      },
    };
    const facts = buildAnalysisFacts(marginalProfile);
    const security = facts.find((fact) => fact.theme === "security");

    assert.equal(
      security,
      undefined,
      "pas de constat sécurité si dépassement marginal (< +10 %)",
    );
  });

  it("commune sans enrichissement — aucun constat thématique sécurité", () => {
    const facts = buildAnalysisFacts(ruralProfileMinimal);

    assert.equal(facts.some((fact) => fact.theme === "security"), false);
  });
});
