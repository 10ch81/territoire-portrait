import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { selectAnalysisFactsForPrompt } from "./select-facts";
import {
  ensureListCoverage,
  ensureOutputCoverage,
  ensureSummaryDemography,
  isSelectedFactCovered,
  normalizeOpportunityTone,
} from "./ensure-output-coverage";
import { saintGironsProfile } from "./fixtures";
import { ANALYSIS_OUTPUT_LIMITS } from "./prompt-limits";
import { buildCanonicalAnalysisOutput } from "./build-canonical-output";
import {
  hasUnsourcedGeoRole,
  hasUnsourcedQualifier,
  stripUnsourcedClaims,
} from "./unsourced-claims";
import { validateAnalysisOutput } from "./validate-output";

describe("ensure-output-coverage", () => {
  it("détecte une formulation vague sans chiffre démographique", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const demography = all.find((f) => f.theme === "demography" && f.target === "watchPoints");

    assert.ok(demography);
    assert.equal(
      isSelectedFactCovered(demography!, [
        "Des enjeux démographiques structurent le territoire.",
      ]),
      false,
    );
    assert.equal(
      isSelectedFactCovered(demography!, [
        "La population recule de -5,7 % entre 2010 et 2022.",
      ]),
      true,
    );
  });

  it("réinjecte le recul démographique omis par Mistral quand requis", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const demographyWatch = all.find(
      (f) => f.theme === "demography" && f.target === "watchPoints",
    )!;
    const selected = [
      ...selectAnalysisFactsForPrompt(all, saintGironsProfile),
      demographyWatch,
    ];

    const covered = ensureListCoverage(
      [
        "Les 60 ans et plus représentent 38,1 % des habitants.",
        "Certains indicateurs de sécurité enregistrée dépassent les références départementales (SSMSI 2024).",
        "La commune a été reconnue à plusieurs reprises en état de catastrophe naturelle pour inondations (CATNAT).",
      ],
      "watchPoints",
      selected,
      [demographyWatch],
    );

    assert.ok(covered.some((item) => /-5,7\s*%/.test(item)));
    assert.ok(covered.some((item) => /38,1\s*%/.test(item)));
  });

  it("ancre l'évolution démographique dans le résumé sans point-virgule", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );

    const summary = ensureSummaryDemography(
      "Saint-Girons compte 6 008 habitants en 2022. Elle présente des enjeux démographiques et des risques naturels.",
      selected,
    );

    assert.match(summary, /-5,7\s*%/);
    assert.match(summary, /2010.*2022/);
    assert.doesNotMatch(summary, /;\s*La population/);
    assert.doesNotMatch(summary, /enjeux démographiques/i);
  });

  it("évite d'avec après remplacement d'enjeux démographiques", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );

    const summary = ensureSummaryDemography(
      "Saint-Girons, commune de 6 008 habitants en Ariège. Son tissu économique s'accompagne cependant d'enjeux démographiques et de vacance immobilière.",
      selected,
    );

    assert.doesNotMatch(summary, /d['']avec\b/i);
    assert.match(summary, /-5,7\s*%/);
  });

  it("dédoublonne recul résumé / watchPoint et backfill logement ou emploi", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );

    const covered = ensureOutputCoverage(
      {
        summary:
          "Saint-Girons compte 6 008 habitants en 2022, avec un recul de population de -5,7 % entre 2010 et 2022.",
        strengths: [],
        watchPoints: [
          "La population recule de -5,7 % entre 2010 et 2022.",
          "Les 60 ans et plus représentent 38,1 % des habitants.",
          "Certains indicateurs de sécurité enregistrée dépassent les références départementales (SSMSI 2024).",
          "La commune a été reconnue en état de catastrophe naturelle pour inondations (CATNAT).",
        ],
      },
      selected,
    );

    assert.doesNotMatch(
      covered.watchPoints.join(" "),
      /recule de -5,7\s*%/,
      "le recul chiffré ne doit pas être dupliqué en watchPoint si déjà dans le résumé",
    );
    assert.ok(
      covered.watchPoints.some((item) => /vacance|logements vacants|chômage/i.test(item)),
      "un slot libéré doit permettre vacance ou chômage",
    );
    assert.ok(covered.watchPoints.length <= ANALYSIS_OUTPUT_LIMITS.watchPoints.max);
  });

  it("validateAnalysisOutput complète watchPoints et summary Saint-Girons", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );
    const canonical = buildCanonicalAnalysisOutput(saintGironsProfile, selected);

    const result = validateAnalysisOutput(
      {
        summary:
          "Saint-Girons, pôle structurant du Couserans, compte 6 008 habitants en 2022. Elle présente une dynamique significative et diversifiée, avec des enjeux démographiques marqués et des risques naturels.",
        strengths: [
          "2 988 postes salariés recensés en 2024 (FLORES).",
          "96,6 % des locaux sont raccordables à la fibre selon l'ARCEP.",
        ],
        watchPoints: [
          "Les 60 ans et plus représentent 38,1 % des habitants.",
          "Certains indicateurs de sécurité enregistrée dépassent les références départementales (SSMSI 2024).",
          "La commune a été reconnue en état de catastrophe naturelle pour inondations (CATNAT).",
        ],
        opportunities: [
          "La commune pourrait renforcer l'accueil touristique grâce à son patrimoine.",
        ],
      },
      selected,
      saintGironsProfile,
    );

    assert.equal(result.summary, canonical.summary);
    assert.match(result.summary, /recul de population de 5,7\s*% entre 2010 et 2022/);
    assert.doesNotMatch(result.summary, /pôle structurant/i);
    assert.ok(result.watchPoints.length <= ANALYSIS_OUTPUT_LIMITS.watchPoints.max);
    assert.ok(result.watchPoints.every((item) => selected.some((fact) => fact.sentence === item)));
  });

  it("normalise le conditionnel des opportunités", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );
    const opportunityFact = selected.find((f) => f.target === "opportunities");
    assert.ok(opportunityFact);

    const normalized = normalizeOpportunityTone(
      ["La commune pourrait " + opportunityFact!.sentence.toLowerCase()],
      selected,
    );

    assert.doesNotMatch(normalized[0] ?? "", /\bpourrait\b/i);
  });
});

describe("unsourced-claims", () => {
  it("détecte qualificatifs et rôles géographiques non sourcés", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);

    assert.equal(
      hasUnsourcedQualifier("Une dynamique significative et diversifiée.", facts),
      true,
    );
    assert.equal(
      hasUnsourcedGeoRole("Saint-Girons, pôle structurant du Couserans.", facts),
      true,
    );
  });

  it("retire les qualificatifs non présents dans les constats", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const stripped = stripUnsourcedClaims(
      "Saint-Girons présente une dynamique significative et diversifiée.",
      facts,
    );

    assert.doesNotMatch(stripped, /\bsignificative\b/i);
    assert.doesNotMatch(stripped, /\bdiversifiée\b/i);
  });

  it("ne retire pas l'EPCI quand Pyrénées fait partie du nom officiel", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const summary =
      "Saint-Girons, commune de 6 008 habitants en 2022, appartient à CC Couserans-Pyrénées (Ariège) et présente une densité de 316 habitants/km².";

    assert.equal(hasUnsourcedGeoRole(summary, facts), false);
    assert.equal(stripUnsourcedClaims(summary, facts), summary);
  });
});

describe("buildDemographyFacts summary anchor", () => {
  it("duplique le recul en constat summary", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const summaryDemo = facts.filter(
      (f) => f.theme === "demography" && f.target === "summary",
    );
    const watchDemo = facts.filter(
      (f) => f.theme === "demography" && f.target === "watchPoints",
    );

    assert.equal(summaryDemo.length, 1);
    assert.equal(watchDemo.length, 1);
    assert.match(summaryDemo[0]!.sentence, /-5,7\s*%/);
  });
});

describe("select-facts max 5 watchPoints", () => {
  it("Saint-Girons sélectionne jusqu'à 5 watchPoints incluant logement ou emploi", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );
    const watchPoints = selected.filter((f) => f.target === "watchPoints");

    assert.ok(watchPoints.length >= 4);
    assert.ok(watchPoints.length <= ANALYSIS_OUTPUT_LIMITS.watchPoints.max);
    assert.ok(
      watchPoints.some((f) => f.theme === "housing" || f.theme === "employment"),
      "avec 5 slots, vacance ou chômage doit entrer en sélection",
    );
  });

  it("remplace le watchPoint démographie par le chômage si le recul est déjà en summary", () => {
    const selected = selectAnalysisFactsForPrompt(
      buildAnalysisFacts(saintGironsProfile),
      saintGironsProfile,
    );
    const watchPoints = selected.filter((f) => f.target === "watchPoints");

    assert.ok(
      selected.some((f) => f.theme === "demography" && f.target === "summary"),
    );
    assert.ok(!watchPoints.some((f) => f.theme === "demography"));
    assert.ok(watchPoints.some((f) => f.theme === "employment"));
  });
});
